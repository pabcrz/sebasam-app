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
  executionRecordInputSchema,
  workAssignmentInputSchema,
  startWorkOrderInputSchema,
  workOrderInputSchema,
  type WorkOrderInput,
} from "./schemas";
import {
  assertActiveWorker,
  assertApprovedQuote,
  assertCapacityConfirmed,
  assertDistinctWorkers,
  assertExecutionCanBeRecorded,
  assertMasterAvailabilityConfirmed,
  assertWorkOrderCanBeAssigned,
  assertWorkOrderCanBeChanged,
  assertWorkOrderCanBeStarted,
  WorkOrderOperationError,
  WorkerUnavailableError,
} from "./domain";

const quotesPath = "/admin/quotes";

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

export async function createWorkOrder(input: unknown) {
  const data = workOrderInputSchema.parse(input);
  return ensureWorkOrderWaiting(data.quoteId, data);
}

export async function ensureWorkOrderWaiting(
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

export async function assignWorkOrder(input: unknown) {
  await requireOperationalRole();

  const data = assignWorkOrderInputSchema.parse(input);
  assertCapacityConfirmed(data.workshopCapacityConfirmed);
  assertMasterAvailabilityConfirmed(data.masterAvailabilityConfirmed);
  assertDistinctWorkers(data.masterId, data.helperIds);

  return prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { quote: true },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertApprovedQuote(workOrder.quote.status);
    assertWorkOrderCanBeAssigned(workOrder.status);

    const workerIds = [data.masterId, ...data.helperIds];
    const workers = await tx.userProfile.findMany({
      where: { id: { in: workerIds }, role: UserRole.WORKER, isActive: true },
      select: { id: true, role: true, workerKind: true, isActive: true },
    });
    const workersById = new Map(workers.map((worker) => [worker.id, worker]));
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

    const now = new Date();
    const updated = await tx.workOrder.updateMany({
      where: { id: data.workOrderId, status: WorkOrderStatus.PLANNED },
      data: {
        status: WorkOrderStatus.ASSIGNED,
        workshopCapacityConfirmedAt: now,
        masterAvailabilityConfirmedAt: now,
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
    });

    return tx.workOrder.findUniqueOrThrow({ where: { id: data.workOrderId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function startWorkOrder(input: unknown) {
  await requireOperationalRole();

  const data = startWorkOrderInputSchema.parse(input);
  assertCapacityConfirmed(data.workshopCapacityConfirmed);
  assertMasterAvailabilityConfirmed(data.masterAvailabilityConfirmed);

  return prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: data.workOrderId },
      include: { quote: true, assignments: { include: { worker: true } } },
    });

    if (!workOrder) {
      throw new WorkOrderOperationError("Orden de trabajo no encontrada.");
    }

    assertApprovedQuote(workOrder.quote.status);
    assertWorkOrderCanBeStarted(workOrder.status);

    const masters = workOrder.assignments.filter(
      (assignment) => assignment.status !== AssignmentStatus.CANCELLED && assignment.worker.workerKind === WorkerKind.MASTER,
    );
    for (const assignment of workOrder.assignments) {
      if (assignment.status === AssignmentStatus.CANCELLED || !assignment.worker.workerKind) continue;
      assertActiveWorker(assignment.worker, assignment.worker.workerKind);
    }
    if (masters.length !== 1) {
      throw new WorkOrderOperationError("La orden requiere exactamente un maestro activo asignado.");
    }

    const now = new Date();
    const updated = await tx.workOrder.updateMany({
      where: { id: data.workOrderId, status: WorkOrderStatus.ASSIGNED },
      data: {
        status: WorkOrderStatus.IN_PROGRESS,
        workshopCapacityConfirmedAt: now,
        masterAvailabilityConfirmedAt: now,
      },
    });

    if (updated.count !== 1) {
      throw new WorkOrderOperationError("El estado de la orden cambió. Recarga e intenta de nuevo.");
    }

    return tx.workOrder.findUniqueOrThrow({ where: { id: data.workOrderId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

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
        summary: data.summary,
        notes: data.notes,
        progressPercent: data.progressPercent,
        isExtra: data.isExtra,
        happenedAt: data.happenedAt,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function removeExecutionRecord(executionRecordId: string) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const record = await tx.executionRecord.findUnique({
      where: { id: executionRecordId },
      include: { workOrder: true },
    });

    if (!record) {
      throw new WorkOrderOperationError("Registro de ejecución no encontrado.");
    }

    assertWorkOrderCanBeChanged(record.workOrder.status);

    if (!record.isExtra) {
      throw new WorkOrderOperationError("Solo se pueden quitar registros marcados como adicionales.");
    }

    return tx.executionRecord.delete({ where: { id: executionRecordId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function ensureWorkOrderWaitingAction(quoteId: string): Promise<ActionResult> {
  try {
    await ensureWorkOrderWaiting(quoteId);
    revalidatePath(quotesPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo enviar la cotización a espera.");
  }
}

export async function assignWorkOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await assignWorkOrder(input);
    revalidatePath(quotesPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo asignar la orden de trabajo.");
  }
}

export async function startWorkOrderAction(input: unknown): Promise<ActionResult> {
  try {
    await startWorkOrder(input);
    revalidatePath(quotesPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo iniciar la orden de trabajo.");
  }
}

export async function recordExecutionAction(input: unknown): Promise<ActionResult> {
  try {
    await recordExecution(input);
    revalidatePath(quotesPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo registrar la ejecución.");
  }
}

export async function removeExecutionRecordAction(executionRecordId: string): Promise<ActionResult> {
  try {
    await removeExecutionRecord(executionRecordId);
    revalidatePath(quotesPath);
    return { success: true };
  } catch (error) {
    return toActionResult(error, "No se pudo quitar el registro adicional.");
  }
}

export async function assignWorker(input: unknown) {
  await requireOperationalRole();

  const data = workAssignmentInputSchema.parse(input);
  await requireActiveWorker(data.workerId);

  return prisma.workAssignment.create({
    data,
  });
}
