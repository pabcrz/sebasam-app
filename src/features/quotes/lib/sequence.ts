import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SequenceClient = Pick<Prisma.TransactionClient, "quote" | "workOrder">;

function formatSequentialNumber(prefix: string, sequence: number, sequenceWidth: number): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  return `${prefix}-${month}${year}-${String(sequence).padStart(sequenceWidth, "0")}`;
}

async function getNextNumber(
  client: SequenceClient,
  table: "quote" | "workOrder",
  prefix: string,
  sequenceWidth: number,
): Promise<string> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefixPattern = `${prefix}-${month}${year}-`;

  // Read all numbers for this prefix/month and parse the numeric suffix.
  // String ordering breaks after 99 (e.g. "99" sorts after "100"), so compute max numerically.
  const records = await (table === "quote"
    ? client.quote.findMany({
        where: { number: { startsWith: prefixPattern } },
        select: { number: true },
      })
    : client.workOrder.findMany({
        where: { number: { startsWith: prefixPattern } },
        select: { number: true },
      }));

  if (records.length === 0) {
    return formatSequentialNumber(prefix, 1, sequenceWidth);
  }

  const highestSequence = records.reduce((highest, record) => {
    const parts = record.number.split("-");

    if (parts.length !== 3) {
      return highest;
    }

    const sequence = Number.parseInt(parts[2], 10);

    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return formatSequentialNumber(prefix, highestSequence + 1, sequenceWidth);
}

export async function nextQuoteNumber(client: SequenceClient = prisma): Promise<string> {
  return getNextNumber(client, "quote", "C", 3);
}

export async function nextWorkOrderNumber(): Promise<string> {
  return getNextNumber(prisma, "workOrder", "T", 2);
}
