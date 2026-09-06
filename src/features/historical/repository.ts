import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { QuoteItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedHistoricalItem, NormalizedHistoricalWork } from "./types";

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-tested without a database)                       */
/* ------------------------------------------------------------------ */

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : Number(value);
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "t" || value === "1";
}

function toDateString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

/** Maps a row from `match_historical_work_items` to a typed source record. */
export function mapMatchRow(row: Record<string, unknown>): HistoricalMatchSource {
  return {
    itemId: String(row.item_id ?? ""),
    workId: String(row.work_id ?? ""),
    workRef: String(row.work_ref ?? ""),
    workDate: toDateString(row.work_date),
    customerName: row.customer_name == null ? null : String(row.customer_name),
    plate: row.plate == null ? null : String(row.plate),
    brand: row.brand == null ? null : String(row.brand),
    model: row.model == null ? null : String(row.model),
    masterName: row.master_name == null ? null : String(row.master_name),
    type: String(row.item_type ?? "") as QuoteItemType,
    description: String(row.description ?? ""),
    quantity: toNumberOrNull(row.quantity),
    customerPriceCents: toNumberOrNull(row.customer_price_cents),
    payrollBaseCents: toNumberOrNull(row.payroll_base_cents),
    ratePercent: toNumberOrNull(row.rate_percent),
    includeInPayroll: toBoolean(row.include_in_payroll),
    isKit: toBoolean(row.is_kit),
    contentHash: String(row.content_hash ?? ""),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    similarity: Number(row.similarity ?? 0),
  };
}

/** Maps a row from `aggregate_historical_items` (bigint columns arrive as strings). */
export function mapAggregateRow(row: Record<string, unknown>): HistoricalAggregateRow {
  return {
    groupKey: String(row.group_key ?? "all"),
    itemCount: Number(row.item_count ?? 0),
    workCount: Number(row.work_count ?? 0),
    totalCustomerCents: Number(row.total_customer_cents ?? 0),
    totalPayrollBaseCents: Number(row.total_payroll_base_cents ?? 0),
    totalCommissionCents: Number(row.total_commission_cents ?? 0),
    avgCustomerCents: Number(row.avg_customer_cents ?? 0),
    avgCommissionCents: Number(row.avg_commission_cents ?? 0),
  };
}

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** Builds the raw INSERT for one item including its pgvector embedding. */
export function buildItemInsertSql(
  workId: string,
  item: NormalizedHistoricalItem,
): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "historical_work_items"
      ("id", "workId", "type", "description", "quantity", "customerPriceCents",
       "payrollBaseCents", "ratePercent", "includeInPayroll", "isKit", "sortOrder",
       "embedding", "metadata", "contentHash", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${workId}, CAST(${item.type} AS "QuoteItemType"), ${item.description}, ${item.quantity},
       ${item.customerPriceCents}, ${item.payrollBaseCents}, ${item.ratePercent},
       ${item.includeInPayroll}, ${item.isKit}, ${item.sortOrder},
       CAST(${vectorLiteral(item.embedding)} AS vector),
       CAST(${JSON.stringify(item.metadata)} AS jsonb),
       ${item.contentHash}, NOW(), NOW())
  `;
}

/* ------------------------------------------------------------------ */
/* Database operations                                                 */
/* ------------------------------------------------------------------ */

export async function listExistingRefs(batchId: string): Promise<Set<string>> {
  const rows = await prisma.historicalWork.findMany({
    where: { batchId },
    select: { workRef: true },
  });
  return new Set(rows.map((row) => row.workRef));
}

/**
 * Inserts one work and all of its items in a single transaction. Items carry
 * the pgvector embedding column, which Prisma's client cannot write, so they
 * are inserted through raw SQL inside the same transaction.
 */
export async function insertWorkWithItems(
  work: NormalizedHistoricalWork,
  items: NormalizedHistoricalItem[],
): Promise<{ workId: string; itemCount: number }> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.historicalWork.create({
      data: {
        batchId: work.batchId,
        workRef: work.workRef,
        workDate: work.workDate,
        customerName: work.customerName,
        plate: work.plate,
        brand: work.brand,
        model: work.model,
        masterName: work.masterName,
        masterId: work.masterId,
        source: work.source,
      },
      select: { id: true },
    });

    for (const item of items) {
      await tx.$executeRaw(buildItemInsertSql(created.id, item));
    }

    return { workId: created.id, itemCount: items.length };
  });
}

export interface MatchHistoricalItemsInput {
  /** 1536-dimension query embedding. */
  embedding: number[];
  threshold?: number;
  count?: number;
  filterType?: string | null;
  filterBrand?: string | null;
  filterModel?: string | null;
}

export interface HistoricalMatchSource {
  itemId: string;
  workId: string;
  workRef: string;
  workDate: string | null;
  customerName: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  masterName: string | null;
  type: QuoteItemType;
  description: string;
  quantity: number | null;
  customerPriceCents: number | null;
  payrollBaseCents: number | null;
  ratePercent: number | null;
  includeInPayroll: boolean;
  isKit: boolean;
  contentHash: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function matchHistoricalItems(
  input: MatchHistoricalItemsInput,
): Promise<HistoricalMatchSource[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM match_historical_work_items(
      CAST(${vectorLiteral(input.embedding)} AS vector(1536)),
      CAST(${input.threshold ?? 0.5} AS real),
      CAST(${input.count ?? 5} AS int),
      CAST(${input.filterType ?? null} AS text),
      CAST(${input.filterBrand ?? null} AS text),
      CAST(${input.filterModel ?? null} AS text)
    )
  `;
  return rows.map(mapMatchRow);
}

export interface AggregateHistoricalItemsInput {
  filterType?: string | null;
  filterBrand?: string | null;
  filterModel?: string | null;
  filterMaster?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  groupBy?: "all" | "type" | "brand" | "model" | "master" | "month";
}

export interface HistoricalAggregateRow {
  groupKey: string;
  itemCount: number;
  workCount: number;
  totalCustomerCents: number;
  totalPayrollBaseCents: number;
  totalCommissionCents: number;
  avgCustomerCents: number;
  avgCommissionCents: number;
}

export async function aggregateHistoricalItems(
  input: AggregateHistoricalItemsInput,
): Promise<HistoricalAggregateRow[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM aggregate_historical_items(
      ${input.filterType ?? null},
      ${input.filterBrand ?? null},
      ${input.filterModel ?? null},
      ${input.filterMaster ?? null},
      ${input.dateFrom ?? null},
      ${input.dateTo ?? null},
      ${input.groupBy ?? "all"}
    )
  `;
  return rows.map(mapAggregateRow);
}

export async function listRecentImportedWorks(limit = 20) {
  return prisma.historicalWork.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      batchId: true,
      workRef: true,
      workDate: true,
      customerName: true,
      masterName: true,
      source: true,
      createdAt: true,
    },
  });
}