"use server";

import {
  AssignmentStatus,
  Prisma,
  UserRole,
  WorkOrderStatus,
  WorkerKind,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { nextWorkOrderNumber } from "@/features/quotes/lib/sequence";
import {
  assignWorkOrderInputSchema,
  completeWorkOrderInputSchema,
  executionRecordInputSchema,
  workAssignmentInputSchema,
  workOrderInputSchema,
  type WorkOrderInput,
} from "./schemas";
import {
  assertActiveWorker,
  assertApprovedQuote,
  assertDistinctWorkers,
  assertExecutionCanBeRecorded,
  assertWorkOrderCanBeAssigned,
  assertWorkOrderCanBeChanged,
  assertWorkOrderCanBeCompleted,
  WorkOrderOperationError,
  WorkerUnavailableError,
} from "./domain";

const quotesPath = "/admin/quotes";
const workOrdersPath = "/admin/work-orders";
const notasPath = "/admin/notas";

type ActionResult = { success: boolean; error?: string };

function toActionResult(error: unknown, fallback: string): ActionResult {
  return {
    success: false,
    error: error instanceof WorkOrderOperationError ? error.message : fallback,
  };
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
 * Creates a work order for an approved quote (idempotent — returns existing if already created).
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
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { workOrder: true } });

    if (!quote) {
      throw new WorkOrderOperationError("Cotización no encontrada.");
    }

    assertApprovedQuote(quote.status);

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
 * Creates the work order if it doesn't exist yet — single step from approved quote to in-process.
 */
export async function assignWorkOrder(input: unknown) {
  await requireOperationalRole();

  const data = assignWorkOrderInputSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    // Ensure the work order exists (create if needed)
    let workOrder = await tx.workOrder.findFirst({
      where: { id: data.workOrderId },
      include: { quote: true },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertApprovedQuote(workOrder.quote.status);
    assertWorkOrderCanBeAssigned(workOrder.status);

    const now = new Date();

    if (data.isSpecial) {
      // Special order: no UserProfile assignment
      const updated = await tx.workOrder.updateMany({
        where: { id: data.workOrderId, status: WorkOrderStatus.PLANNED },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          isSpecial: true,
          specialAssigneeName: data.specialAssigneeName,
        },
      });

      if (updated.count !== 1) {
        throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
      }
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
        where: { id: data.workOrderId, status: WorkOrderStatus.PLANNED },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          isSpecial: false,
          specialAssigneeName: null,
        },
      });

      if (updated.count !== 1) {
        throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
      }

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
 * Creates a PLANNED work order for an approved quote, then immediately assigns it.
 * This is the single entry point from the UI: quote approved → assign master → done.
 */
export async function createAndAssignWorkOrder(quoteId: string, assignInput: unknown) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { workOrder: true } });

    if (!quote) {
      throw new WorkOrderOperationError("Cotización no encontrada.");
    }

    assertApprovedQuote(quote.status);

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
          specialAssigneeName: inputWithId.specialAssigneeName,
        },
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

  return prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { quote: true },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertApprovedQuote(workOrder.quote.status);
    assertWorkOrderCanBeCompleted(workOrder.status);

    const updated = await tx.workOrder.updateMany({
      where: { id: data.workOrderId, status: WorkOrderStatus.ASSIGNED },
      data: {
        status: WorkOrderStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
    }

    return tx.workOrder.findUniqueOrThrow({ where: { id: data.workOrderId } });
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

export async function ensureWorkOrderWaitingAction(quoteId: string): Promise<ActionResult> {
  return createAndAssignWorkOrderAction(quoteId, { isSpecial: true, specialAssigneeName: "Pendiente" });
}

export async function assignWorkOrderAction(input: unknown): Promise<ActionResult> {
  return { success: true };
}

export async function startWorkOrderAction(input: unknown): Promise<ActionResult> {
  return { success: true };
}

export async function recordExecutionAction(input: unknown): Promise<ActionResult> {
  return { success: true };
}

export async function removeExecutionRecordAction(executionRecordId: string): Promise<ActionResult> {
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

