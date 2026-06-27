"use server";

import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { executionRecordInputSchema, workOrderInputSchema } from "./schemas";
import { nextWorkOrderNumber } from "@/features/quotes/lib/sequence";

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

  return prisma.executionRecord.create({
    data,
  });
}
