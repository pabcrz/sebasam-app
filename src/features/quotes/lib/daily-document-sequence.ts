import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { mexicoCityCalendarDate } from "./operational-date";

export type DailyDocumentType = "C" | "N";

export type SequenceTransactionClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export interface AllocatedDailyDocumentFolio {
  folio: string;
  businessDate: string;
  sequence: number;
  issuedAt: Date;
}

/**
 * Pure formatter for daily document folios: C-DDMMYY-NN and N-DDMMYY-NN.
 * The sequence is padded to a minimum of two digits (01, 42, 99, 100).
 * Values above 99 are never truncated.
 */
export function formatDailyDocumentFolio(
  type: DailyDocumentType,
  businessDate: string,
  sequence: number,
): string {
  const [yearStr, monthStr, dayStr] = businessDate.split("-");
  if (!yearStr || !monthStr || !dayStr) {
    throw new Error(`Invalid business date format for daily folio: ${businessDate}. Expected YYYY-MM-DD.`);
  }

  const dateSegment = `${dayStr}${monthStr}${yearStr.slice(-2)}`;
  const paddedSequence = sequence < 10 ? `0${sequence}` : String(sequence);
  return `${type}-${dateSegment}-${paddedSequence}`;
}

/**
 * Atomically allocates the next daily document sequence counter using PostgreSQL
 * INSERT ... ON CONFLICT ("documentType", "businessDate") DO UPDATE ... RETURNING.
 * The counter value is formatted by formatDailyDocumentFolio.
 * The issuance timestamp and daily sequence date derive from the same operation.
 */
export async function allocateDailyDocumentFolio(
  tx: SequenceTransactionClient,
  type: DailyDocumentType,
  now = new Date(),
): Promise<AllocatedDailyDocumentFolio> {
  const businessDate = mexicoCityCalendarDate(now);
  const id = randomUUID();

  const rows = await tx.$queryRaw<Array<{ lastSequence: number | bigint | string }>>`
    INSERT INTO "DailyDocumentSequence"
      ("id", "documentType", "businessDate", "lastSequence", "createdAt", "updatedAt")
    VALUES
      (${id}, ${type}, ${businessDate}, 1, NOW(), NOW())
    ON CONFLICT ("documentType", "businessDate")
    DO UPDATE SET
      "lastSequence" = "DailyDocumentSequence"."lastSequence" + 1,
      "updatedAt" = NOW()
    RETURNING "lastSequence";
  `;

  const sequence = Number(rows[0]?.lastSequence ?? 0);
  if (!sequence || sequence < 1) {
    throw new Error(`Failed to allocate daily document sequence for ${type} on ${businessDate}.`);
  }

  const folio = formatDailyDocumentFolio(type, businessDate, sequence);

  return {
    folio,
    businessDate,
    sequence,
    issuedAt: now,
  };
}
