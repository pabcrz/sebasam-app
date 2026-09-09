"use server";

import { randomUUID } from "node:crypto";
import {
  AssignmentStatus,
  PaymentRequestStatus,
  Prisma,
  QuoteDecisionOrigin,
  QuoteLifecycleEventType,
  QuoteStatus,
  UserRole,
  WorkOrderStatus,
  WorkerKind,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { createVehicleSnapshot } from "@/features/vehicles/schemas";
import { nextQuoteNumber, nextWorkOrderNumber, withQuoteNumberRetry } from "@/features/quotes/lib/sequence";
import { calculateItemTotalCents, createQuoteValidUntil } from "@/features/quotes/lib/calculate";
import { normalizeOperationalDate, operationalDateToCompletedAt } from "@/features/quotes/lib/operational-date";
import { ensureSharedQuoteInTransaction } from "@/features/quotes/domain";
import type { QuoteFormActionState } from "@/features/quotes/actions";
import {
  buildVehicleInput,
  draftTotals,
  hasVehicleData,
  nullableOptional,
  quoteFormDataToInput,
} from "@/features/quotes/quote-helpers";
import {
  assignWorkOrderInputSchema,
  completeWorkOrderInputSchema,
  convertQuoteToNoteInputSchema,
  directWorkOrderFormInputSchema,
  directWorkOrderInputSchema,
  executionRecordInputSchema,
  returnNoteToQuoteInputSchema,
  rollbackWorkOrderInputSchema,
  workAssignmentInputSchema,
  workOrderInputSchema,
  type WorkOrderInput,
} from "./schemas";
import {
  assertActiveWorker,
  assertApprovedQuote,
  assertDistinctWorkers,
  assertExecutionCanBeRecorded,
  assertOperationalQuote,
  assertWorkOrderCanBeAssigned,
  assertWorkOrderCanBeChanged,
  assertWorkOrderCanBeCompleted,
  WorkOrderOperationError,
  WorkerUnavailableError,
} from "./domain";
import { ZodError } from "zod";
import { assertOperationalClosureQuote, assertOperationalStartQuote } from "./operational-validation";
import {
  ineligibleCompletedWorkKnowledge,
  prepareCompletedWorkKnowledge,
  synchronizeCompletedWorkKnowledge,
} from "@/features/completed-work-knowledge/service";
import { calculateDefaultPaymentDueDate } from "./receivables-policy";
import { notifyCustomerWorkOrderCompleted } from "./notifications";

const quotesPath = "/admin/quotes";
const workOrdersPath = "/admin/work-orders";
const notasPath = "/admin/notas";
const rollbackableWorkOrderStatuses: WorkOrderStatus[] = [
  WorkOrderStatus.PLANNED,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.COMPLETED,
];
const inactivePaymentRequestStatuses = [PaymentRequestStatus.CANCELLED, PaymentRequestStatus.EXPIRED];

type ActionResult = { success: boolean; error?: string };

function toActionResult(error: unknown, fallback: string): ActionResult {
  return {
    success: false,
    error: error instanceof WorkOrderOperationError ? error.message : fallback,
  };
}

async function synchronizeCompletedWorkKnowledgeSafely(workOrderId: string) {
  try {
    await synchronizeCompletedWorkKnowledge(workOrderId);
  } catch (error) {
    console.error("Completed work knowledge synchronization failed", { workOrderId, error });
  }
}

async function prepareCompletedWorkKnowledgeSafely(workOrderId: string) {
  try {
    await prepareCompletedWorkKnowledge(workOrderId);
  } catch (error) {
    console.error("Completed work knowledge preparation failed", { workOrderId, error });
  }
}

async function scheduleCompletedWorkKnowledge(workOrderId: string) {
  await prepareCompletedWorkKnowledgeSafely(workOrderId);
  try {
    after(async () => {
      await synchronizeCompletedWorkKnowledgeSafely(workOrderId);
    });
  } catch (error) {
    console.error("Completed work knowledge scheduling failed", { workOrderId, error });
  }
}

async function requireActiveWorker(workerId: string) {
  const worker = await prisma.userProfile.findFirst({
    where: {
      id: workerId,
      role: UserRole.WORKER,
      isActive: true,
      workerKind: { not: null },
    },
    select: { id: true },
  });

  if (!worker) {
    throw new WorkerUnavailableError();
  }
}

/**
 * Creates a work order for an operational quote (idempotent — returns existing if already created).
 */
export async function createWorkOrder(input: unknown) {
  const data = workOrderInputSchema.parse(input);
  return ensureWorkOrderPlanned(data.quoteId, data);
}

async function ensureWorkOrderPlanned(
  quoteId: string,
  input: Pick<WorkOrderInput, "scheduledFor" | "siteAddress" | "notes"> = {},
) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { vehicle: true, workOrder: true, items: true, sections: { include: { items: true } } } });

    if (!quote) {
      throw new WorkOrderOperationError("Cotización no encontrada.");
    }

    assertOperationalQuote(quote.status);
    assertOperationalStartQuote(quote);

    if (quote.workOrder) {
      assertWorkOrderCanBeChanged(quote.workOrder.status);
      return quote.workOrder;
    }

    const number = await nextWorkOrderNumber(tx);
    return tx.workOrder.create({
      data: {
        quoteId,
        number,
        scheduledFor: input.scheduledFor,
        siteAddress: input.siteAddress,
        notes: input.notes,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Assigns a work order to a master (and optional helpers), or marks it as a special order.
 * Creates the work order if it doesn't exist yet — single step from an operational quote to in-process.
 */
export async function assignWorkOrder(input: unknown) {
  await requireOperationalRole();

  const data = assignWorkOrderInputSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    // Ensure the work order exists (create if needed)
    const workOrder = await tx.workOrder.findFirst({
      where: { id: data.workOrderId },
      include: { quote: { include: { vehicle: true, items: true, sections: { include: { items: true } } } } },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertOperationalQuote(workOrder.quote.status);
    assertOperationalStartQuote(workOrder.quote);
    assertWorkOrderCanBeAssigned(workOrder.status);



    if (data.isSpecial) {
      // Special order: no UserProfile assignment
      const updated = await tx.workOrder.updateMany({
        where: { id: data.workOrderId, status: { in: [WorkOrderStatus.PLANNED, WorkOrderStatus.ASSIGNED] } },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          isSpecial: true,
          specialAssigneeName: null,
        },
      });

      if (updated.count !== 1) {
        throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
      }

      await tx.workAssignment.deleteMany({
        where: { workOrderId: data.workOrderId },
      });
    } else {
      assertDistinctWorkers(data.masterId, data.helperIds);

      const workerIds = [data.masterId, ...data.helperIds];
      const workers = await tx.userProfile.findMany({
        where: { id: { in: workerIds }, role: UserRole.WORKER, isActive: true },
        select: { id: true, role: true, workerKind: true, isActive: true },
      });
      const workersById = new Map(workers.map((w) => [w.id, w]));
      const master = workersById.get(data.masterId);

      if (!master) {
        throw new WorkOrderOperationError("El maestro no existe o está inactivo.");
      }

      assertActiveWorker(master, WorkerKind.MASTER);

      for (const helperId of data.helperIds) {
        const helper = workersById.get(helperId);
        if (!helper) {
          throw new WorkOrderOperationError("Uno de los ayudantes no existe o está inactivo.");
        }
        assertActiveWorker(helper, WorkerKind.HELPER);
      }

      const updated = await tx.workOrder.updateMany({
        where: { id: data.workOrderId, status: { in: [WorkOrderStatus.PLANNED, WorkOrderStatus.ASSIGNED] } },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          isSpecial: false,
          specialAssigneeName: null,
        },
      });

      if (updated.count !== 1) {
        throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
      }

      await tx.workAssignment.deleteMany({
        where: { workOrderId: data.workOrderId },
      });

      await tx.workAssignment.createMany({
        data: workerIds.map((workerId) => ({
          workOrderId: data.workOrderId,
          workerId,
          status: AssignmentStatus.ASSIGNED,
        })),
        skipDuplicates: true,
      });
    }

    return tx.workOrder.findUniqueOrThrow({ where: { id: data.workOrderId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Creates a PLANNED work order for an operational quote, then immediately assigns it.
 * This is the single entry point from the UI: validate quote, assign master, and start work.
 */
export async function createAndAssignWorkOrder(quoteId: string, assignInput: unknown) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { vehicle: true, workOrder: true, items: true, sections: { include: { items: true } } } });

    if (!quote) {
      throw new WorkOrderOperationError("Cotización no encontrada.");
    }

    assertOperationalQuote(quote.status);
    assertOperationalStartQuote(quote);

    let workOrderId: string;

    if (quote.workOrder) {
      assertWorkOrderCanBeAssigned(quote.workOrder.status);
      workOrderId = quote.workOrder.id;
    } else {
      const number = await nextWorkOrderNumber(tx);
      const created = await tx.workOrder.create({
        data: { quoteId, number },
      });
      workOrderId = created.id;
    }

    // Now assign using the parsed input
    const assignObj = typeof assignInput === "object" && assignInput !== null ? { ...assignInput } : {};
    delete (assignObj as Record<string, unknown>).workOrderId;
    const data = assignWorkOrderInputSchema.parse({ ...assignObj, workOrderId });
    const inputWithId = data;

    // Inline the assign logic (can't call assignWorkOrder since we're already in a tx)
    if (inputWithId.isSpecial) {
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          isSpecial: true,
          specialAssigneeName: null,
        },
      });

      await tx.workAssignment.deleteMany({
        where: { workOrderId },
      });
    } else {
      assertDistinctWorkers(inputWithId.masterId, inputWithId.helperIds);

      const workerIds = [inputWithId.masterId, ...inputWithId.helperIds];
      const workers = await tx.userProfile.findMany({
        where: { id: { in: workerIds }, role: UserRole.WORKER, isActive: true },
        select: { id: true, role: true, workerKind: true, isActive: true },
      });
      const workersById = new Map(workers.map((w) => [w.id, w]));
      const master = workersById.get(inputWithId.masterId);

      if (!master) throw new WorkOrderOperationError("El maestro no existe o está inactivo.");
      assertActiveWorker(master, WorkerKind.MASTER);

      for (const helperId of inputWithId.helperIds) {
        const helper = workersById.get(helperId);
        if (!helper) throw new WorkOrderOperationError("Uno de los ayudantes no existe o está inactivo.");
        assertActiveWorker(helper, WorkerKind.HELPER);
      }

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          isSpecial: false,
          specialAssigneeName: null,
        },
      });

      await tx.workAssignment.deleteMany({
        where: { workOrderId },
      });

      await tx.workAssignment.createMany({
        data: workerIds.map((workerId) => ({
          workOrderId,
          workerId,
          status: AssignmentStatus.ASSIGNED,
        })),
        skipDuplicates: true,
      });
    }

    return tx.workOrder.findUniqueOrThrow({ where: { id: workOrderId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Completes a work order (ASSIGNED → COMPLETED).
 * After this, the quote items are frozen and a delivery note (Nota de Remisión) can be printed.
 */
export async function completeWorkOrder(input: unknown) {
  await requireOperationalRole();

  const data = completeWorkOrderInputSchema.parse(input);

  const completedWorkOrder = await prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { quote: { include: { vehicle: true, items: true, sections: { include: { items: true } } } } },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertOperationalQuote(workOrder.quote.status);
    assertWorkOrderCanBeCompleted(workOrder.status);
    assertOperationalClosureQuote(workOrder.quote);

    const completedAt = new Date();
    const paymentDueDate =
      workOrder.paymentDueDate ??
      workOrder.quote.paymentDueDate ??
      calculateDefaultPaymentDueDate(completedAt);

    const updated = await tx.workOrder.updateMany({
      where: { id: data.workOrderId, status: WorkOrderStatus.ASSIGNED },
      data: {
        status: WorkOrderStatus.COMPLETED,
        completedAt,
        paymentDueDate,
      },
    });

    if (updated.count !== 1) {
      throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
    }

    await tx.workAssignment.updateMany({
      where: {
        workOrderId: data.workOrderId,
        status: { notIn: [AssignmentStatus.DONE, AssignmentStatus.CANCELLED] },
      },
      data: { status: AssignmentStatus.DONE },
    });

    return tx.workOrder.findUniqueOrThrow({ where: { id: data.workOrderId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await scheduleCompletedWorkKnowledge(data.workOrderId);
  await notifyCustomerWorkOrderCompleted(data.workOrderId);
  return completedWorkOrder;
}

export async function rollbackWorkOrder(input: unknown) {
  const { profile } = await requireOperationalRole();
  const data = rollbackWorkOrderInputSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { quote: true },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }
    if (workOrder.quote.isLocked) {
      throw new WorkOrderOperationError("El documento está bloqueado.");
    }
    if (!rollbackableWorkOrderStatuses.includes(workOrder.status)) {
      throw new WorkOrderOperationError("La orden ya fue cancelada. Recarga la página para ver su estado actual.");
    }
    assertOperationalQuote(workOrder.quote.status);

    const [paymentCount, applicationCount, ledgerEntryCount] = await Promise.all([
      tx.payment.count({ where: { quoteId: workOrder.quoteId } }),
      tx.paymentApplication?.count
        ? tx.paymentApplication.count({ where: { workOrderId: workOrder.id } })
        : Promise.resolve(0),
      tx.ledgerEntry.count({
        where: {
          OR: [
            { workOrderId: workOrder.id },
            { payment: { quoteId: workOrder.quoteId } },
          ],
        },
      }),
    ]);
    if (paymentCount > 0) {
      throw new WorkOrderOperationError("No se puede cancelar esta orden porque la cotización tiene pagos. La corrección financiera requiere otro proceso.");
    }
    if (applicationCount > 0) {
      throw new WorkOrderOperationError("No se puede cancelar esta orden porque tiene aplicaciones de pago registradas.");
    }
    if (ledgerEntryCount > 0) {
      throw new WorkOrderOperationError("No se puede cancelar esta orden porque tiene movimientos en el ledger. La corrección financiera requiere otro proceso.");
    }

    const cancelled = await tx.workOrder.updateMany({
      where: { id: workOrder.id, status: workOrder.status },
      data: { status: WorkOrderStatus.CANCELLED },
    });
    if (cancelled.count !== 1) {
      throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
    }

    await tx.workAssignment.updateMany({
      where: { workOrderId: workOrder.id, status: { notIn: [AssignmentStatus.DONE, AssignmentStatus.CANCELLED] } },
      data: { status: AssignmentStatus.CANCELLED },
    });
    await tx.paymentRequest.updateMany({
      where: {
        OR: [{ quoteId: workOrder.quoteId }, { workOrderId: workOrder.id }],
        status: { notIn: inactivePaymentRequestStatuses },
      },
      data: { status: PaymentRequestStatus.CANCELLED },
    });
    const restored = await tx.quote.updateMany({
      where: { id: workOrder.quoteId, status: workOrder.quote.status },
      data: { status: data.targetQuoteStatus },
    });
    if (restored.count !== 1) {
      throw new WorkOrderOperationError("El estado de la cotización cambió. Recarga e intenta de nuevo.");
    }
    await tx.quoteLifecycleEvent.create({
      data: {
        quoteId: workOrder.quoteId,
        eventType: workOrder.status === WorkOrderStatus.COMPLETED ? "RETURN_TO_QUOTE" : "STATUS_CHANGE",
        previousState: workOrder.quote.status,
        nextState: data.targetQuoteStatus,
        actorId: profile.id,
        reason: data.reason,
      },
    });
    await ineligibleCompletedWorkKnowledge(workOrder.id, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

// ─── Internal / future use: execution tracking ──────────────────────────────
// These actions are kept for the future execution tracking feature (progress + photos
// visible to the customer). They are not exposed in the UI yet.

export async function recordExecution(input: unknown) {
  await requireOperationalRole();

  const data = executionRecordInputSchema.parse(input);

  await requireActiveWorker(data.workerId);

  return prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { quote: true },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertApprovedQuote(workOrder.quote.status);
    assertExecutionCanBeRecorded(workOrder.status);

    if (workOrder.isSpecial) {
      throw new WorkOrderOperationError("Los trabajos especiales del Taller no admiten registros de ejecución vinculados a trabajadores.");
    }

    const worker = await tx.userProfile.findUnique({
      where: { id: data.workerId },
      select: { id: true, role: true, workerKind: true, isActive: true },
    });

    if (!worker) {
      throw new WorkOrderOperationError("El trabajador no existe.");
    }

    if (worker.role !== UserRole.WORKER || !worker.isActive || !worker.workerKind) {
      throw new WorkOrderOperationError("El trabajador debe estar activo y tener una clasificación laboral.");
    }

    return tx.executionRecord.create({
      data: {
        workOrderId: data.workOrderId,
        workerId: data.workerId,
        summary: data.summary || "",
        notes: data.notes,
        progressPercent: data.progressPercent,
        isExtra: data.isExtra,
        happenedAt: data.happenedAt,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

// ─── Server Action wrappers ───────────────────────────────────────────────────

export async function createAndAssignWorkOrderAction(
  quoteId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await createAndAssignWorkOrder(quoteId, input);
    revalidatePath(quotesPath);
    revalidatePath(workOrdersPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo asignar la orden de trabajo.");
  }
}

export async function completeWorkOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await completeWorkOrder(input);
    revalidatePath(workOrdersPath);
    revalidatePath(notasPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo finalizar la orden de trabajo.");
  }
}

export async function rollbackWorkOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await rollbackWorkOrder(input);
    revalidatePath(quotesPath);
    revalidatePath(workOrdersPath);
    revalidatePath(notasPath);
    return { success: true };
  } catch (error) {
    if (error instanceof WorkOrderOperationError) {
      return { success: false, error: error.message };
    }
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Revisa los datos de la corrección." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "La operación cambió mientras se corregía. Recarga e inténtalo de nuevo." };
    }
    console.error("Work order rollback failed", { input, error });
    return { success: false, error: "No se pudo corregir la orden. Recarga la página e inténtalo de nuevo." };
  }
}

export async function ensureWorkOrderWaitingAction(quoteId: string): Promise<ActionResult> {
  return createAndAssignWorkOrderAction(quoteId, { isSpecial: true });
}

export async function assignWorkOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await assignWorkOrder(input);
    revalidatePath(workOrdersPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo asignar/reasignar la orden de trabajo.");
  }
}

export async function startWorkOrderAction(_input: unknown): Promise<ActionResult> {
  return { success: true };
}

export async function recordExecutionAction(_input: unknown): Promise<ActionResult> {
  return { success: true };
}

export async function removeExecutionRecordAction(_executionRecordId: string): Promise<ActionResult> {
  return { success: true };
}

// Legacy: kept for backward compatibility during migration
export async function assignWorker(input: unknown) {
  await requireOperationalRole();

  const data = workAssignmentInputSchema.parse(input);
  await requireActiveWorker(data.workerId);

  return prisma.workAssignment.create({
    data,
  });
}

function directWorkOrderFormDataToInput(formData: FormData) {
  return {
    ...quoteFormDataToInput(formData),
    masterId: formData.get("masterId"),
    isCompleted: formData.get("isCompleted"),
  };
}

export async function createDirectWorkOrder(input: unknown) {
  const { profile } = await requireOperationalRole();
  const data = directWorkOrderInputSchema.parse(input);
  const totals = draftTotals(data);
  const validUntil = createQuoteValidUntil();
  const operationalDate = normalizeOperationalDate(data.operationalDate);
  const completedAt = data.isCompleted ? operationalDateToCompletedAt(data.operationalDate) : null;

  const quoteLike = {
    customerId: data.customerId ?? null,
    vehicle: data.vehicle
      ? {
          plate: data.vehicle.plate ?? null,
          brand: data.vehicle.brand ?? null,
          model: data.vehicle.model ?? null,
        }
      : null,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents ?? data.discountCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    taxEnabled: data.taxEnabled,
    sections: data.sections.map((section) => ({
      items: section.items.map((item) => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents ?? null,
      })),
    })),
  };

  assertOperationalStartQuote(quoteLike);
  if (data.isCompleted) {
    assertOperationalClosureQuote(quoteLike);
  }

  const result = await withQuoteNumberRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const master = await tx.userProfile.findFirst({
          where: {
            id: data.masterId,
            role: UserRole.WORKER,
            workerKind: WorkerKind.MASTER,
            isActive: true,
          },
        });

        if (!master) {
          throw new WorkOrderOperationError("El maestro responsable seleccionado no es válido o no está activo.");
        }

        assertOperationalStartQuote(quoteLike);
        if (data.isCompleted) {
          assertOperationalClosureQuote(quoteLike);
        }

        const quoteId = randomUUID();
        const quoteNumber = await nextQuoteNumber(tx);
        const workOrderNumber = await nextWorkOrderNumber(tx);
        const hasVehicle = hasVehicleData(data.vehicle);
        const shouldLinkVehicle = Boolean(data.customerId && hasVehicle);
        const vehicle = shouldLinkVehicle
          ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
          : null;
        const vehicleSnapshot = hasVehicle
          ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
          : Prisma.JsonNull;

        const sectionData = data.sections.map((section, sIndex) => ({
          name: section.name,
          isAuthorized: true,
          sortOrder: sIndex,
        }));

        const effectiveDate = completedAt ?? new Date();

        const createdQuote = await tx.quote.create({
          data: {
            id: quoteId,
            customerId: data.customerId ?? null,
            vehicleId: vehicle?.id ?? null,
            vehicleSnapshot,
            number: quoteNumber,
            status: QuoteStatus.APPROVED,
            approvedAt: effectiveDate,
            title: data.title,
            description: nullableOptional(data.description),
            administrative: data.administrative,
            taxEnabled: data.taxEnabled,
            subtotalCents: totals.subtotalCents,
            discountCents: totals.discountCents ?? data.discountCents,
            taxCents: totals.taxCents,
            totalCents: totals.totalCents,
            operationalDate,
            validUntil,
            paymentDueDate: data.paymentDueDate ?? null,
            sections: { create: sectionData },
          },
          include: { sections: true },
        });

        await ensureSharedQuoteInTransaction(tx, createdQuote.id);

        const itemsToCreate: Prisma.QuoteItemCreateManyInput[] = [];
        data.sections.forEach((sectionInput, sIndex) => {
          const createdSection = createdQuote.sections.find((s) => s.sortOrder === sIndex);
          if (createdSection) {
            sectionInput.items.forEach((item, iIndex) => {
              itemsToCreate.push({
                quoteId: createdQuote.id,
                sectionId: createdSection.id,
                type: item.type,
                description: item.description,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents ?? null,
                totalCents:
                  item.unitPriceCents === undefined
                    ? null
                    : calculateItemTotalCents(item.quantity, item.unitPriceCents),
                includeInPayroll: item.type === "OTHER" ? Boolean(item.includeInPayroll) : item.type === "LABOR",
                customRatePercent:
                  item.type === "OTHER" && item.includeInPayroll
                    ? item.customRatePercent ?? 40
                    : item.customRatePercent ?? null,
                sortOrder: iIndex,
              });
            });
          }
        });

        if (itemsToCreate.length > 0) {
          await tx.quoteItem.createMany({ data: itemsToCreate });
        }

        await tx.quoteDecision.create({
          data: {
            quoteId: createdQuote.id,
            status: QuoteStatus.APPROVED,
            origin: QuoteDecisionOrigin.ADMIN,
            actorId: profile.id,
            note: "Trabajo creado directamente",
            authorizedSectionIds: createdQuote.sections.map((s) => s.id),
            createdAt: effectiveDate,
          },
        });

        await tx.quoteLifecycleEvent.create({
          data: {
            quoteId: createdQuote.id,
            previousState: QuoteStatus.DRAFT,
            nextState: QuoteStatus.APPROVED,
            eventType: data.isCompleted ? QuoteLifecycleEventType.CONVERT_TO_NOTE : QuoteLifecycleEventType.STATUS_CHANGE,
            actorId: profile.id,
            reason: data.isCompleted ? "Nota creada directamente" : "Trabajo creado directamente",
            createdAt: effectiveDate,
          },
        });

        const calculatedDueDate = data.isCompleted
          ? (data.paymentDueDate ?? calculateDefaultPaymentDueDate(completedAt ?? effectiveDate))
          : (data.paymentDueDate ?? null);

        const workOrder = await tx.workOrder.create({
          data: {
            quoteId: createdQuote.id,
            number: workOrderNumber,
            status: data.isCompleted ? WorkOrderStatus.COMPLETED : WorkOrderStatus.ASSIGNED,
            completedAt,
            paymentDueDate: calculatedDueDate,
          },
        });

        await tx.workAssignment.create({
          data: {
            workOrderId: workOrder.id,
            workerId: data.masterId,
            status: data.isCompleted ? AssignmentStatus.DONE : AssignmentStatus.ASSIGNED,
            assignedAt: effectiveDate,
          },
        });

        return { quote: createdQuote, workOrder };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );

  if (data.isCompleted) {
    await scheduleCompletedWorkKnowledge(result.workOrder.id);
    await notifyCustomerWorkOrderCompleted(result.workOrder.id);
  }

  return result;
}

export async function createDirectWorkOrderFromWorkspace(
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  const parsed = directWorkOrderFormInputSchema.safeParse(directWorkOrderFormDataToInput(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos e intenta de nuevo." };
  }

  try {
    await createDirectWorkOrder(parsed.data);
  } catch (error) {
    if (error instanceof WorkOrderOperationError) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message) {
      return { error: error.message };
    }
    return { error: "No se pudo crear el trabajo. Intenta de nuevo." };
  }

  revalidatePath(quotesPath);
  revalidatePath(workOrdersPath);
  revalidatePath(notasPath);
  return { success: true };
}

export async function createDirectNote(input: unknown) {
  const parsed = directWorkOrderInputSchema.parse(input);
  return createDirectWorkOrder({
    ...parsed,
    isCompleted: true,
  });
}

export async function createDirectNoteFromWorkspace(
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  const input = directWorkOrderFormDataToInput(formData);
  const parsed = directWorkOrderFormInputSchema.safeParse({
    ...input,
    isCompleted: "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos e intenta de nuevo." };
  }

  try {
    await createDirectWorkOrder(parsed.data);
  } catch (error) {
    if (error instanceof WorkOrderOperationError) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message) {
      return { error: error.message };
    }
    return { error: "No se pudo crear la nota. Intenta de nuevo." };
  }

  revalidatePath(quotesPath);
  revalidatePath(workOrdersPath);
  revalidatePath(notasPath);
  return { success: true };
}

export async function convertQuoteToNoteAction(input: unknown) {
  const { profile } = await requireOperationalRole();
  const data = convertQuoteToNoteInputSchema.parse(input);

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: data.quoteId },
      include: {
        items: true,
        sections: { include: { items: true } },
        workOrder: { include: { assignments: true } },
        vehicle: true,
      },
    });

    if (!quote) {
      throw new WorkOrderOperationError("Cotización no encontrada.");
    }
    if (quote.isLocked) {
      throw new WorkOrderOperationError("El documento está bloqueado.");
    }

    assertOperationalClosureQuote(quote);

    const effectiveDate = new Date();
    let workOrder = quote.workOrder;

    if (!workOrder) {
      const masterId = data.masterId;
      if (!masterId) {
        throw new WorkOrderOperationError("Se requiere un maestro responsable para convertir la cotización a nota.");
      }

      const master = await tx.userProfile.findFirst({
        where: { id: masterId, role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true },
      });
      if (!master) {
        throw new WorkOrderOperationError("El maestro responsable seleccionado no es válido o no está activo.");
      }

      if (quote.status !== QuoteStatus.APPROVED) {
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            status: QuoteStatus.APPROVED,
            approvedAt: effectiveDate,
            paymentDueDate: data.paymentDueDate ?? quote.paymentDueDate,
          },
        });
        await tx.quoteDecision.create({
          data: {
            quoteId: quote.id,
            status: QuoteStatus.APPROVED,
            origin: QuoteDecisionOrigin.ADMIN,
            actorId: profile.id,
            note: "Cotización aprobada al convertir a nota",
            authorizedSectionIds: quote.sections.map((s) => s.id),
            createdAt: effectiveDate,
          },
        });
      } else if (data.paymentDueDate) {
        await tx.quote.update({
          where: { id: quote.id },
          data: { paymentDueDate: data.paymentDueDate },
        });
      }

      const notePaymentDueDate =
        data.paymentDueDate ??
        quote.paymentDueDate ??
        calculateDefaultPaymentDueDate(effectiveDate);

      const workOrderNumber = await nextWorkOrderNumber(tx);
      const createdWorkOrder = await tx.workOrder.create({
        data: {
          quoteId: quote.id,
          number: workOrderNumber,
          status: WorkOrderStatus.COMPLETED,
          completedAt: effectiveDate,
          paymentDueDate: notePaymentDueDate,
        },
        include: { assignments: true },
      });
      workOrder = createdWorkOrder;

      await tx.workAssignment.create({
        data: {
          workOrderId: createdWorkOrder.id,
          workerId: masterId,
          status: AssignmentStatus.DONE,
          assignedAt: effectiveDate,
        },
      });
    } else {
      if (workOrder.status === WorkOrderStatus.CANCELLED) {
        throw new WorkOrderOperationError("La orden de trabajo fue cancelada.");
      }

      if (data.paymentDueDate) {
        await tx.quote.update({
          where: { id: quote.id },
          data: { paymentDueDate: data.paymentDueDate },
        });
      }

      const notePaymentDueDate =
        data.paymentDueDate ??
        workOrder.paymentDueDate ??
        quote.paymentDueDate ??
        calculateDefaultPaymentDueDate(effectiveDate);

      if (workOrder.status !== WorkOrderStatus.COMPLETED) {
        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: {
            status: WorkOrderStatus.COMPLETED,
            completedAt: effectiveDate,
            paymentDueDate: notePaymentDueDate,
          },
        });

        await tx.workAssignment.updateMany({
          where: {
            workOrderId: workOrder.id,
            status: { notIn: [AssignmentStatus.DONE, AssignmentStatus.CANCELLED] },
          },
          data: { status: AssignmentStatus.DONE },
        });
      }
    }

    await ensureSharedQuoteInTransaction(tx, quote.id);

    await tx.quoteLifecycleEvent.create({
      data: {
        quoteId: quote.id,
        previousState: quote.status,
        nextState: QuoteStatus.APPROVED,
        eventType: QuoteLifecycleEventType.CONVERT_TO_NOTE,
        actorId: profile.id,
        reason: data.reason?.trim() || "Cotización convertida a nota",
        createdAt: effectiveDate,
      },
    });

    return { quote, workOrder };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (result.workOrder) {
    await scheduleCompletedWorkKnowledge(result.workOrder.id);
    await notifyCustomerWorkOrderCompleted(result.workOrder.id);
  }

  revalidatePath(quotesPath);
  revalidatePath(workOrdersPath);
  revalidatePath(notasPath);
  return result;
}

export async function returnNoteToQuoteAction(input: unknown) {
  const data = returnNoteToQuoteInputSchema.parse(input);
  return rollbackWorkOrderAction({
    workOrderId: data.workOrderId,
    targetQuoteStatus: "DRAFT",
    reason: data.reason,
  });
}
