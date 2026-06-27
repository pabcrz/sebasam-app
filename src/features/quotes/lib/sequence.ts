import { prisma } from "@/lib/prisma";

function formatSequentialNumber(prefix: string, sequence: number): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  return `${prefix}-${month}${year}-${String(sequence).padStart(2, "0")}`;
}

async function getNextNumber(
  table: "quote" | "workOrder",
  prefix: string,
): Promise<string> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefixPattern = `${prefix}-${month}${year}-`;

  // Read all numbers for this prefix/month and parse the numeric suffix.
  // String ordering breaks after 99 (e.g. "99" sorts after "100"), so compute max numerically.
  const records = await (table === "quote"
    ? prisma.quote.findMany({
        where: { number: { startsWith: prefixPattern } },
        select: { number: true },
      })
    : prisma.workOrder.findMany({
        where: { number: { startsWith: prefixPattern } },
        select: { number: true },
      }));

  if (records.length === 0) {
    return formatSequentialNumber(prefix, 1);
  }

  const highestSequence = records.reduce((highest, record) => {
    const parts = record.number.split("-");

    if (parts.length !== 3) {
      return highest;
    }

    const sequence = Number.parseInt(parts[2], 10);

    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return formatSequentialNumber(prefix, highestSequence + 1);
}

export async function nextQuoteNumber(): Promise<string> {
  return getNextNumber("quote", "C");
}

export async function nextWorkOrderNumber(): Promise<string> {
  return getNextNumber("workOrder", "T");
}
