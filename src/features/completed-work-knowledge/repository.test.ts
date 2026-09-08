import { KnowledgeIndexState, QuoteItemType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { $queryRaw: vi.fn(), workOrder: { findMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  aggregateCompletedWork,
  aggregateCompletedWorkOrders,
  matchCompletedWork,
} from "./repository";

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1", type: QuoteItemType.LABOR, description: "Replace bushings", quantity: 1,
    unitPriceCents: 1000, totalCents: 1000, includeInPayroll: false,
    customPayrollBaseCents: null, customRatePercent: null, ...overrides,
  };
}

describe("completed-work repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps snapshot-only vehicles and Mexico City completion dates from the mocked pgvector query", async () => {
    prisma.$queryRaw.mockResolvedValue([{
      item_id: "item-1", work_order_id: "order-1", work_order_number: "OT-01",
      completed_at: new Date("2026-09-01T02:00:00.000Z"), brand: "Nissan", model: "NP300", plate: "ABC123",
      responsible_worker: "Ana", item_type: "LABOR", description: "Replace bushings", quantity: "1.00",
      item_total_cents: 1000, quote_total_cents: 3200, include_in_payroll: false, similarity: 0.9,
    }]);

    const embedding = Array.from({ length: 1536 }, (_, index) => index / 1536);
    const [source] = await matchCompletedWork({
      embedding,
      filterType: QuoteItemType.LABOR,
      filterBrand: "Nissan",
      filterModel: "NP300",
    });

    expect(source).toMatchObject({
      provenance: "completed-work", workOrderNumber: "OT-01", completedAt: "2026-08-31",
      brand: "Nissan", model: "NP300", plate: "ABC123", currentQuoteTotalCents: 3200,
      responsibleWorker: "Ana", generatedCommissionCents: 500,
    });
    const query = prisma.$queryRaw.mock.calls[0][0] as { strings: readonly string[]; values: unknown[] };
    const text = query.strings.join(" ");
    const vector = `[${embedding.join(",")}]`;
    expect(text).toContain('source."indexState" = CAST(');
    expect(query.values).toContain(KnowledgeIndexState.INDEXED);
    expect(text).toContain('source."embedding" IS NOT NULL');
    expect(text).toContain('work_order."status" = CAST(');
    expect(text).toContain('work_order."completedAt" IS NOT NULL');
    expect(text).toContain('item."quoteId" = work_order."quoteId"');
    expect(text).toContain('AS vector(1536)');
    expect(query.values.filter((value) => value === vector)).toHaveLength(3);
    expect(text).toContain('COALESCE(vehicle."brand", quote."vehicleSnapshot" ->> \'brand\')');
    expect(text).toContain('COALESCE(vehicle."model", quote."vehicleSnapshot" ->> \'model\')');
  });

  it("counts the live quote total once per order and commissions only matching items", () => {
    const aggregate = aggregateCompletedWorkOrders([{ id: "order-1", quote: {
      totalCents: 10000,
      items: [item(), item({ id: "item-2", type: QuoteItemType.OTHER, totalCents: 2000, includeInPayroll: true, customRatePercent: 25 })],
    } }]);

    expect(aggregate).toEqual({ itemCount: 2, workCount: 1, totalGeneratedIncomeCents: 10000, totalGeneratedCommissionCents: 1000 });
  });

  it("uses structured filters in the operational query, independent of semantic hits", async () => {
    prisma.workOrder.findMany.mockResolvedValue([{ id: "order-1", quote: { totalCents: 1000, items: [item()] } }]);

    const aggregate = await aggregateCompletedWork({
      filterType: QuoteItemType.LABOR, filterBrand: "Nissan", filterModel: "NP300", filterDescription: "bushing",
      filterMaster: "Ana", dateFrom: new Date("2026-09-01"), dateTo: new Date("2026-09-30"),
    });

    expect(aggregate).toMatchObject({ workCount: 1, totalGeneratedIncomeCents: 1000, totalGeneratedCommissionCents: 500 });
    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "COMPLETED", quote: expect.objectContaining({ items: { some: expect.objectContaining({ description: expect.any(Object) }) } }) }),
    }));
  });
});
