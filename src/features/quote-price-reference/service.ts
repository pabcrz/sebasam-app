import { createHash, randomUUID } from "node:crypto";
import { KnowledgeIndexState, Prisma, WorkOrderStatus } from "@/generated/prisma/client";
import { createGeminiProvider, type HistoricalProvider } from "@/features/historical/provider";
import { prisma } from "@/lib/prisma";
import { PRICE_REFERENCE_STATUSES } from "./eligibility";

type EmbeddingProvider = Pick<HistoricalProvider, "embedText">;

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function unitContext(
  vehicle: { brand: string | null; model: string | null; plate: string | null } | null,
  snapshot: unknown,
): string {
  const snap = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : {};
  const text = (live: string | null | undefined, key: string) => live ?? (typeof snap[key] === "string" ? snap[key] as string : null);
  const unit = [text(vehicle?.brand, "brand"), text(vehicle?.model, "model")].filter(Boolean).join(" ");
  const plate = text(vehicle?.plate, "plate");
  return [unit, plate ? `Plate ${plate}` : ""].filter(Boolean).join(", ") || "Unspecified unit";
}

/** Builds the retrieval text. It deliberately carries no prices or totals. */
export function buildQuotePriceReferenceContext(input: { unit: string; type: string; description: string }): string {
  return `Quote price reference. Unit ${input.unit}. Concept type ${input.type}. Description ${input.description}`;
}

async function loadReferenceSources(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      status: true,
      deletedAt: true,
      vehicleSnapshot: true,
      vehicle: { select: { brand: true, model: true, plate: true } },
      workOrder: { select: { status: true } },
      items: { select: { id: true, type: true, description: true } },
    },
  });
  if (!quote || quote.deletedAt || !PRICE_REFERENCE_STATUSES.includes(quote.status)
    || quote.workOrder?.status === WorkOrderStatus.COMPLETED) {
    return null;
  }
  const unit = unitContext(quote.vehicle, quote.vehicleSnapshot);
  return quote.items.map((item) => {
    const contextText = buildQuotePriceReferenceContext({ unit, type: item.type, description: item.description });
    return { quoteItemId: item.id, contextText, contextHash: createHash("sha256").update(contextText).digest("hex") };
  });
}

/**
 * Projects the quote's concepts and embeds the ones not yet indexed. Idempotent;
 * a provider failure is stored per source and never thrown to the caller's flow.
 */
export async function synchronizeQuotePriceReferences(
  quoteId: string,
  providedProvider?: EmbeddingProvider,
): Promise<{ indexed: number; failed: number; skipped: number }> {
  const sources = await loadReferenceSources(quoteId);
  if (!sources) {
    await prisma.quotePriceReferenceSource.updateMany({
      where: { quoteId },
      data: { indexState: KnowledgeIndexState.INELIGIBLE, lastIndexError: null },
    });
    return { indexed: 0, failed: 0, skipped: 0 };
  }

  const totals = { indexed: 0, failed: 0, skipped: 0 };
  let provider = providedProvider;
  for (const source of sources) {
    const [row] = await prisma.$queryRaw<{ id: string; indexState: KnowledgeIndexState }[]>(Prisma.sql`
      INSERT INTO "quote_price_reference_sources" ("id", "quoteId", "quoteItemId", "contextText", "contextHash", "indexState", "updatedAt")
      VALUES (${randomUUID()}, ${quoteId}, ${source.quoteItemId}, ${source.contextText}, ${source.contextHash},
        CAST(${KnowledgeIndexState.PENDING} AS "KnowledgeIndexState"), CURRENT_TIMESTAMP)
      ON CONFLICT ("quoteItemId") DO UPDATE SET
        "contextText" = EXCLUDED."contextText",
        "embedding" = CASE WHEN "quote_price_reference_sources"."contextHash" <> EXCLUDED."contextHash" THEN NULL
          ELSE "quote_price_reference_sources"."embedding" END,
        "indexState" = CASE
          WHEN "quote_price_reference_sources"."contextHash" <> EXCLUDED."contextHash"
            OR "quote_price_reference_sources"."indexState" = CAST(${KnowledgeIndexState.INELIGIBLE} AS "KnowledgeIndexState")
            THEN CAST(${KnowledgeIndexState.PENDING} AS "KnowledgeIndexState")
          ELSE "quote_price_reference_sources"."indexState" END,
        "contextHash" = EXCLUDED."contextHash",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "id", "indexState"
    `);
    if (!row || row.indexState === KnowledgeIndexState.INDEXED) {
      totals.skipped += 1;
      continue;
    }
    const attemptedAt = new Date();
    try {
      provider ??= createGeminiProvider();
      const embedding = await provider.embedText(source.contextText);
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "quote_price_reference_sources"
        SET "embedding" = CAST(${vectorLiteral(embedding)} AS vector(1536)),
            "indexState" = CAST(${KnowledgeIndexState.INDEXED} AS "KnowledgeIndexState"),
            "indexingAttempts" = "indexingAttempts" + 1, "lastIndexError" = NULL,
            "lastAttemptedAt" = ${attemptedAt}, "indexedAt" = ${attemptedAt}, "updatedAt" = ${attemptedAt}
        WHERE "id" = ${row.id} AND "contextHash" = ${source.contextHash}
      `);
      totals.indexed += 1;
    } catch (error) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "quote_price_reference_sources"
        SET "indexState" = CAST(${KnowledgeIndexState.FAILED} AS "KnowledgeIndexState"),
            "indexingAttempts" = "indexingAttempts" + 1,
            "lastIndexError" = ${error instanceof Error ? error.message : String(error)},
            "lastAttemptedAt" = ${attemptedAt}, "updatedAt" = ${attemptedAt}
        WHERE "id" = ${row.id} AND "contextHash" = ${source.contextHash}
      `);
      totals.failed += 1;
    }
  }
  return totals;
}

/** Backfill and retry: quotes with no projection yet or with unfinished/failed rows. */
export async function reindexQuotePriceReferences(
  provider?: EmbeddingProvider,
): Promise<{ quotes: number; indexed: number; failed: number; skipped: number }> {
  const quotes = await prisma.quote.findMany({
    where: {
      deletedAt: null,
      status: { in: PRICE_REFERENCE_STATUSES },
      NOT: { workOrder: { is: { status: WorkOrderStatus.COMPLETED } } },
      items: { some: {} },
      OR: [
        { priceReferenceSources: { none: {} } },
        { priceReferenceSources: { some: { indexState: { in: [KnowledgeIndexState.PENDING, KnowledgeIndexState.FAILED, KnowledgeIndexState.INELIGIBLE] } } } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const totals = { quotes: quotes.length, indexed: 0, failed: 0, skipped: 0 };
  for (const quote of quotes) {
    const result = await synchronizeQuotePriceReferences(quote.id, provider);
    totals.indexed += result.indexed;
    totals.failed += result.failed;
    totals.skipped += result.skipped;
  }
  return totals;
}
