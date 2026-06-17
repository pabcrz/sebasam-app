"use server";

import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { executionRecordInputSchema, workOrderInputSchema } from "./schemas";

export async function createWorkOrder(input: unknown) {
  await requireUser();

  const data = workOrderInputSchema.parse(input);
  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: data.quoteId } });

  if (quote.status !== QuoteStatus.APPROVED) {
    throw new Error("Work orders require an approved quote.");
  }

  return prisma.workOrder.create({
    data: {
      quoteId: data.quoteId,
      number: `WO-${Date.now()}`,
      scheduledFor: data.scheduledFor,
      siteAddress: data.siteAddress,
      notes: data.notes,
    },
  });
}

export async function recordExecution(input: unknown) {
  await requireUser();

  const data = executionRecordInputSchema.parse(input);

  return prisma.executionRecord.create({
    data,
  });
}
