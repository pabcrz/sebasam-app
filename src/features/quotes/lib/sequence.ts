import { prisma } from "@/lib/prisma";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";

type SequenceClient = Pick<PrismaTypes.TransactionClient, "$queryRaw">;
type HighestSequenceRow = { highestSequence: string };

export const QUOTE_NUMBER_MAX_RETRIES = 2;

function isQuoteNumberUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  return Array.isArray(target) && target.length === 1 && target[0] === "number";
}

export async function withQuoteNumberRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= QUOTE_NUMBER_MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === QUOTE_NUMBER_MAX_RETRIES || !isQuoteNumberUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new Error("Quote number retry loop exhausted unexpectedly.");
}

function formatSequentialNumber(prefix: string, sequence: number, sequenceWidth: number): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefixSegment = prefix ? `${prefix}-` : "";

  return `${prefixSegment}${month}${year}-${String(sequence).padStart(sequenceWidth, "0")}`;
}

async function getNextNumber(
  table: "quote" | "workOrder",
  prefix: string,
  sequenceWidth: number,
  client: SequenceClient = prisma,
): Promise<string> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const prefixPattern = prefix ? `${prefix}-${month}${year}-` : `${month}${year}-`;
  const legacyPrefixPattern = `C-${month}${year}-`;

  const rows = table === "quote"
    ? await client.$queryRaw<HighestSequenceRow[]>`
        SELECT COALESCE(MAX(parsed_suffix), 0)::text AS "highestSequence"
        FROM (
          SELECT (regexp_match(suffix, '^[[:space:]]*[+]?[0-9]+'))[1]::numeric AS parsed_suffix
          FROM (
            SELECT substring("number" FROM ${prefixPattern.length + 1}::integer) AS suffix
            FROM "Quote"
            WHERE "number" LIKE ${`${prefixPattern}%`} AND "deletedAt" IS NULL
            UNION ALL
            SELECT substring("number" FROM ${legacyPrefixPattern.length + 1}::integer) AS suffix
            FROM "Quote"
            WHERE "number" LIKE ${`${legacyPrefixPattern}%`} AND "deletedAt" IS NULL
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
            FROM "WorkOrder"
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
  return getNextNumber("quote", "", 3, client);
}

export async function nextWorkOrderNumber(client?: SequenceClient): Promise<string> {
  return getNextNumber("workOrder", "T", 2, client);
}
