import { KnowledgeIndexState, Prisma, QuoteItemType, WorkOrderStatus, WorkerKind } from "@/generated/prisma/client";
import { evaluatePayrollItem } from "@/features/payroll/domain";
import { mexicoCityCalendarDate } from "@/features/quotes/lib/operational-date";
import { prisma } from "@/lib/prisma";

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toDate(value: unknown): string | null {
  if (!value) return null;
  return value instanceof Date ? mexicoCityCalendarDate(value) : String(value).slice(0, 10);
}

export interface CompletedWorkMatchSource {
  provenance: "completed-work";
  itemId: string;
  workOrderId: string;
  workOrderNumber: string;
  completedAt: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
  responsibleWorker: string;
  type: QuoteItemType;
  description: string;
  quantity: number;
  itemTotalCents: number | null;
  currentQuoteTotalCents: number | null;
  generatedCommissionCents: number;
  similarity: number;
}

export function mapCompletedWorkMatchRow(row: Record<string, unknown>): CompletedWorkMatchSource {
  const payroll = evaluatePayrollItem({
    id: String(row.item_id),
    type: String(row.item_type) as QuoteItemType,
    description: String(row.description),
    quantity: toNumber(row.quantity),
    unitPriceCents: row.unit_price_cents == null ? null : toNumber(row.unit_price_cents),
    totalCents: row.item_total_cents == null ? null : toNumber(row.item_total_cents),
    includeInPayroll: row.include_in_payroll === true,
    customPayrollBaseCents: row.custom_payroll_base_cents == null ? null : toNumber(row.custom_payroll_base_cents),
    customRatePercent: row.custom_rate_percent == null ? null : toNumber(row.custom_rate_percent),
  });
  return {
    provenance: "completed-work",
    itemId: String(row.item_id),
    workOrderId: String(row.work_order_id),
    workOrderNumber: String(row.work_order_number),
    completedAt: toDate(row.completed_at) ?? "",
    brand: row.brand == null ? null : String(row.brand),
    model: row.model == null ? null : String(row.model),
    plate: row.plate == null ? null : String(row.plate),
    responsibleWorker: String(row.responsible_worker ?? "Unassigned"),
    type: String(row.item_type) as QuoteItemType,
    description: String(row.description),
    quantity: toNumber(row.quantity),
    itemTotalCents: row.item_total_cents == null ? null : toNumber(row.item_total_cents),
    currentQuoteTotalCents: row.quote_total_cents == null ? null : toNumber(row.quote_total_cents),
    generatedCommissionCents: payroll?.commissionCents ?? 0,
    similarity: toNumber(row.similarity),
  };
}

export interface MatchCompletedWorkInput {
  embedding: number[];
  threshold?: number;
  count?: number;
  filterType?: QuoteItemType | null;
  filterBrand?: string | null;
  filterModel?: string | null;
}

/** Reads indexed vectors and live operational values; no mutable values are projected. */
export async function matchCompletedWork(
  input: MatchCompletedWorkInput,
): Promise<CompletedWorkMatchSource[]> {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    SELECT
      item."id" AS item_id, work_order."id" AS work_order_id, work_order."number" AS work_order_number,
      work_order."completedAt" AS completed_at,
      COALESCE(vehicle."brand", quote."vehicleSnapshot" ->> 'brand') AS brand,
      COALESCE(vehicle."model", quote."vehicleSnapshot" ->> 'model') AS model,
      COALESCE(vehicle."plate", quote."vehicleSnapshot" ->> 'plate') AS plate,
      CASE WHEN work_order."isSpecial"
        THEN COALESCE(NULLIF(work_order."specialAssigneeName", ''), 'Workshop')
        ELSE COALESCE(master."displayName", 'Unassigned')
      END AS responsible_worker,
      item."type" AS item_type, item."description", item."quantity", item."unitPriceCents" AS unit_price_cents,
      item."totalCents" AS item_total_cents, item."includeInPayroll" AS include_in_payroll,
      item."customPayrollBaseCents" AS custom_payroll_base_cents, item."customRatePercent" AS custom_rate_percent,
      quote."totalCents" AS quote_total_cents,
      1 - (source."embedding" <=> CAST(${vectorLiteral(input.embedding)} AS vector(1536))) AS similarity
    FROM "completed_work_knowledge_sources" source
    JOIN "WorkOrder" work_order ON work_order."id" = source."workOrderId"
    JOIN "Quote" quote ON quote."id" = work_order."quoteId"
    JOIN "QuoteItem" item ON item."id" = source."quoteItemId" AND item."quoteId" = work_order."quoteId"
    LEFT JOIN "Vehicle" vehicle ON vehicle."id" = quote."vehicleId"
    LEFT JOIN LATERAL (
      SELECT profile."displayName"
      FROM "WorkAssignment" assignment
      JOIN "UserProfile" profile ON profile."id" = assignment."workerId"
      WHERE assignment."workOrderId" = work_order."id"
        AND profile."workerKind" = CAST(${WorkerKind.MASTER} AS "WorkerKind")
      ORDER BY assignment."assignedAt"
      LIMIT 1
    ) master ON true
    WHERE source."indexState" = CAST(${KnowledgeIndexState.INDEXED} AS "KnowledgeIndexState")
      AND source."embedding" IS NOT NULL
      AND work_order."status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
      AND work_order."completedAt" IS NOT NULL
      AND (${input.filterType ?? null}::"QuoteItemType" IS NULL OR item."type" = ${input.filterType ?? null}::"QuoteItemType")
      AND (${input.filterBrand ?? null}::text IS NULL OR COALESCE(vehicle."brand", quote."vehicleSnapshot" ->> 'brand') ILIKE '%' || ${input.filterBrand ?? null} || '%')
      AND (${input.filterModel ?? null}::text IS NULL OR COALESCE(vehicle."model", quote."vehicleSnapshot" ->> 'model') ILIKE '%' || ${input.filterModel ?? null} || '%')
      AND 1 - (source."embedding" <=> CAST(${vectorLiteral(input.embedding)} AS vector(1536))) >= ${input.threshold ?? 0.4}
    ORDER BY source."embedding" <=> CAST(${vectorLiteral(input.embedding)} AS vector(1536)), source."id"
    LIMIT ${input.count ?? 5}
  `);
  return rows.map(mapCompletedWorkMatchRow);
}

export interface CompletedWorkAggregate {
  itemCount: number;
  workCount: number;
  totalGeneratedIncomeCents: number;
  totalGeneratedCommissionCents: number;
}

export interface AggregateCompletedWorkInput {
  filterType?: QuoteItemType | null;
  filterBrand?: string | null;
  filterModel?: string | null;
  filterDescription?: string | null;
  filterMaster?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
}

type AggregateOrder = {
  id: string;
  quote: {
    totalCents: number | null;
    items: Array<{
      id: string;
      type: QuoteItemType;
      description: string;
      quantity: { toString(): string };
      unitPriceCents: number | null;
      totalCents: number | null;
      includeInPayroll: boolean;
      customPayrollBaseCents: number | null;
      customRatePercent: number | null;
    }>;
  };
};

export function aggregateCompletedWorkOrders(orders: AggregateOrder[]): CompletedWorkAggregate {
  return orders.reduce<CompletedWorkAggregate>((aggregate, order) => {
    aggregate.workCount += 1;
    aggregate.totalGeneratedIncomeCents += order.quote.totalCents ?? 0;
    for (const item of order.quote.items) {
      aggregate.itemCount += 1;
      aggregate.totalGeneratedCommissionCents += evaluatePayrollItem({
        ...item,
        quantity: Number(item.quantity),
      })?.commissionCents ?? 0;
    }
    return aggregate;
  }, { itemCount: 0, workCount: 0, totalGeneratedIncomeCents: 0, totalGeneratedCommissionCents: 0 });
}

/** Calculates from current quote rows, independently of the semantic hit list. */
export async function aggregateCompletedWork(
  input: AggregateCompletedWorkInput,
): Promise<CompletedWorkAggregate> {
  const itemWhere: Prisma.QuoteItemWhereInput = {
    type: input.filterType ?? undefined,
    description: input.filterDescription ? { contains: input.filterDescription, mode: "insensitive" } : undefined,
  };
  const orders = await prisma.workOrder.findMany({
    where: {
      status: WorkOrderStatus.COMPLETED,
      completedAt: { not: null, gte: input.dateFrom ?? undefined, lte: input.dateTo ?? undefined },
      quote: {
        vehicle: input.filterBrand || input.filterModel ? {
          is: {
            brand: input.filterBrand ? { contains: input.filterBrand, mode: "insensitive" } : undefined,
            model: input.filterModel ? { contains: input.filterModel, mode: "insensitive" } : undefined,
          },
        } : undefined,
        items: { some: itemWhere },
      },
      OR: input.filterMaster ? [
        { isSpecial: true, specialAssigneeName: { contains: input.filterMaster, mode: "insensitive" } },
        { isSpecial: false, assignments: { some: { worker: { workerKind: WorkerKind.MASTER, displayName: { contains: input.filterMaster, mode: "insensitive" } } } } },
      ] : undefined,
    },
    select: {
      id: true,
      quote: {
        select: {
          totalCents: true,
          items: {
            where: itemWhere,
            select: {
              id: true, type: true, description: true, quantity: true, unitPriceCents: true, totalCents: true,
              includeInPayroll: true, customPayrollBaseCents: true, customRatePercent: true,
            },
          },
        },
      },
    },
  });
  return aggregateCompletedWorkOrders(orders);
}
