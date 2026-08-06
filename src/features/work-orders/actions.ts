"use server";

import { QuoteStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  executionRecordInputSchema,
  workAssignmentInputSchema,
  workOrderInputSchema,
} from "./schemas";
import { nextWorkOrderNumber } from "@/features/quotes/lib/sequence";

export class WorkerUnavailableError extends Error {
  constructor() {
    super("Only active workers with a classification can receive assignments or execution records.");
    this.name = "WorkerUnavailableError";
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

export async function createWorkOrder(input: unknown) {
  await requireOperationalRole();

  const data = workOrderInputSchema.parse(input);
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: data.quoteId } });

  if (quote.status !== QuoteStatus.APPROVED) {
    throw new Error("Work orders require an approved quote.");
  }

  const woNumber = await nextWorkOrderNumber();

  return prisma.workOrder.create({
    data: {
      quoteId: data.quoteId,
      number: woNumber,
      scheduledFor: data.scheduledFor,
      siteAddress: data.siteAddress,
      notes: data.notes,
    },
  });
}

export async function recordExecution(input: unknown) {
  await requireOperationalRole();

  const data = executionRecordInputSchema.parse(input);

  if (data.workerId) {
    await requireActiveWorker(data.workerId);
  }

  return prisma.executionRecord.create({
    data,
  });
}

export async function assignWorker(input: unknown) {
  await requireOperationalRole();

  const data = workAssignmentInputSchema.parse(input);
  await requireActiveWorker(data.workerId);

  return prisma.workAssignment.create({
    data,
  });
}
