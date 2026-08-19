import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type SequenceClient = Pick<Prisma.TransactionClient, "$queryRaw">;
type HighestSequenceRow = { highestSequence: string };

function formatSequentialNumber(prefix: string, sequence: number, sequenceWidth: number): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  return `${prefix}-${month}${year}-${String(sequence).padStart(sequenceWidth, "0")}`;
}

async function getNextNumber(
  table: "quote" | "workOrder" | "operationalWork",
  prefix: string,
  sequenceWidth: number,
  client: SequenceClient = prisma,
): Promise<string> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefixPattern = `${prefix}-${month}${year}-`;

  const rows = table === "quote"
    ? await client.$queryRaw<HighestSequenceRow[]>`
        SELECT COALESCE(MAX(parsed_suffix), 0)::text AS "highestSequence"
        FROM (
          SELECT (regexp_match(suffix, '^[[:space:]]*[+]?[0-9]+'))[1]::numeric AS parsed_suffix
          FROM (
            SELECT substring("number" FROM ${prefixPattern.length + 1}::integer) AS suffix
            FROM "Quote"
            WHERE "number" LIKE ${`${prefixPattern}%`}
          ) AS matching
          WHERE suffix !~ '-'
        ) AS parsed
        WHERE parsed_suffix <= '1.7976931348623157e308'::numeric
      `
    : table === "workOrder"
      ? await client.$queryRaw<HighestSequenceRow[]>`
        SELECT COALESCE(MAX(parsed_suffix), 0)::text AS "highestSequence"
        FROM (
          SELECT (regexp_match(suffix, '^[[:space:]]*[+]?[0-9]+'))[1]::numeric AS parsed_suffix
          FROM (
            SELECT substring("number" FROM ${prefixPattern.length + 1}::integer) AS suffix
          FROM "WorkOrder"
            WHERE "number" LIKE ${`${prefixPattern}%`}
          ) AS matching
          WHERE suffix !~ '-'
        ) AS parsed
        WHERE parsed_suffix <= '1.7976931348623157e308'::numeric
      `
      : await client.$queryRaw<HighestSequenceRow[]>`
        SELECT COALESCE(MAX(parsed_suffix), 0)::text AS "highestSequence"
        FROM (
          SELECT (regexp_match(suffix, '^[[:space:]]*[+]?[0-9]+'))[1]::numeric AS parsed_suffix
          FROM (
            SELECT substring("number" FROM ${prefixPattern.length + 1}::integer) AS suffix
            FROM "OperationalWork"
            WHERE "number" LIKE ${`${prefixPattern}%`}
          ) AS matching
          WHERE suffix !~ '-'
        ) AS parsed
        WHERE parsed_suffix <= '1.7976931348623157e308'::numeric
      `;
  const highestSequence = Number.parseInt(rows[0]?.highestSequence ?? "0", 10);

  return formatSequentialNumber(prefix, highestSequence + 1, sequenceWidth);
}

export async function nextQuoteNumber(client?: SequenceClient): Promise<string> {
  return getNextNumber("quote", "C", 3, client);
}

export async function nextWorkOrderNumber(client?: SequenceClient): Promise<string> {
  return getNextNumber("workOrder", "T", 2, client);
}

export async function nextOperationalWorkNumber(client?: SequenceClient): Promise<string> {
  return getNextNumber("operationalWork", "O", 3, client);
}
