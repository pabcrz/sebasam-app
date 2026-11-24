import { KnowledgeIndexState, Prisma, QuoteItemType, QuoteStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { mexicoCityCalendarDate } from "@/features/quotes/lib/operational-date";
import { prisma } from "@/lib/prisma";
import { PRICE_REFERENCE_STATUSES } from "./eligibility";

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** A quoted price: never realized income, commission or payment. */
export interface QuotePriceReferenceSource {
  provenance: "quote-reference";
  itemId: string;
  quoteId: string;
  quoteNumber: string;
  quoteStatus: QuoteStatus;
  quotedOn: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
  type: QuoteItemType;
  description: string;
  quantity: number;
  unitPriceCents: number | null;
  itemTotalCents: number | null;
  similarity: number;
}

export function mapQuotePriceReferenceRow(row: Record<string, unknown>): QuotePriceReferenceSource {
  const cents = (value: unknown) => (value == null ? null : Number(value));
  return {
    provenance: "quote-reference",
    itemId: String(row.item_id),
    quoteId: String(row.quote_id),
    quoteNumber: String(row.quote_number),
    quoteStatus: String(row.quote_status) as QuoteStatus,
    quotedOn: row.operational_date instanceof Date ? row.operational_date.toISOString().slice(0, 10) : String(row.operational_date).slice(0, 10),
    brand: row.brand == null ? null : String(row.brand),
    model: row.model == null ? null : String(row.model),
    plate: row.plate == null ? null : String(row.plate),
    type: String(row.item_type) as QuoteItemType,
    description: String(row.description),
    quantity: Number(row.quantity ?? 0),
    unitPriceCents: cents(row.unit_price_cents),
    itemTotalCents: cents(row.item_total_cents),
    similarity: Number(row.similarity),
  };
}

export interface MatchQuotePriceReferencesInput {
  embedding: number[];
  threshold?: number;
  count?: number;
  filterType?: QuoteItemType | null;
  filterBrand?: string | null;
  filterModel?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  keyword?: string | null;
}

/**
 * Eligibility is evaluated here, against the live quote, so a cancelled, archived,
 * deleted or completed quote can never surface even if its projection row is stale.
 */
export async function matchQuotePriceReferences(input: MatchQuotePriceReferencesInput): Promise<QuotePriceReferenceSource[]> {
  const keyword = input.keyword?.trim() || null;
  const keywordHit = Prisma.sql`(${keyword}::text IS NOT NULL AND item."description" ILIKE '%' || ${keyword} || '%')`;
  const statuses = Prisma.join(PRICE_REFERENCE_STATUSES.map((status) => Prisma.sql`CAST(${status} AS "QuoteStatus")`));
  const dateFrom = input.dateFrom ? mexicoCityCalendarDate(input.dateFrom) : null;
  const dateTo = input.dateTo ? mexicoCityCalendarDate(input.dateTo) : null;
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT
      item."id" AS item_id, quote."id" AS quote_id, quote."number" AS quote_number, quote."status" AS quote_status,
      quote."operationalDate" AS operational_date,
      COALESCE(vehicle."brand", quote."vehicleSnapshot" ->> 'brand') AS brand,
      COALESCE(vehicle."model", quote."vehicleSnapshot" ->> 'model') AS model,
      COALESCE(vehicle."plate", quote."vehicleSnapshot" ->> 'plate') AS plate,
      item."type" AS item_type, item."description", item."quantity",
      item."unitPriceCents" AS unit_price_cents, item."totalCents" AS item_total_cents,
      CASE WHEN ${keywordHit} THEN 1
        ELSE 1 - (source."embedding" <=> CAST(${vectorLiteral(input.embedding)} AS vector(1536))) END AS similarity
    FROM "quote_price_reference_sources" source
    JOIN "Quote" quote ON quote."id" = source."quoteId"
    JOIN "QuoteItem" item ON item."id" = source."quoteItemId" AND item."quoteId" = quote."id"
    LEFT JOIN "Vehicle" vehicle ON vehicle."id" = quote."vehicleId"
    WHERE source."indexState" <> CAST(${KnowledgeIndexState.INELIGIBLE} AS "KnowledgeIndexState")
      AND quote."deletedAt" IS NULL
      AND quote."status" IN (${statuses})
      AND NOT EXISTS (
        SELECT 1 FROM "WorkOrder" work_order
        WHERE work_order."quoteId" = quote."id"
          AND work_order."status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
      )
      AND (${input.filterType ?? null}::"QuoteItemType" IS NULL OR item."type" = ${input.filterType ?? null}::"QuoteItemType")
      AND (${input.filterBrand ?? null}::text IS NULL OR COALESCE(vehicle."brand", quote."vehicleSnapshot" ->> 'brand') ILIKE '%' || ${input.filterBrand ?? null} || '%')
      AND (${input.filterModel ?? null}::text IS NULL OR COALESCE(vehicle."model", quote."vehicleSnapshot" ->> 'model') ILIKE '%' || ${input.filterModel ?? null} || '%')
      AND (${dateFrom}::date IS NULL OR quote."operationalDate" >= ${dateFrom}::date)
      AND (${dateTo}::date IS NULL OR quote."operationalDate" <= ${dateTo}::date)
      AND (
        ${keywordHit}
        OR (
          source."indexState" = CAST(${KnowledgeIndexState.INDEXED} AS "KnowledgeIndexState")
          AND source."embedding" IS NOT NULL
          AND 1 - (source."embedding" <=> CAST(${vectorLiteral(input.embedding)} AS vector(1536))) >= ${input.threshold ?? 0.4}
        )
      )
    ORDER BY CASE WHEN ${keywordHit} THEN 0 ELSE 1 END,
      source."embedding" <=> CAST(${vectorLiteral(input.embedding)} AS vector(1536)) NULLS LAST, source."id"
    LIMIT ${input.count ?? 5}
  `);
  return rows.map(mapQuotePriceReferenceRow);
}
