import { describe, expect, it, vi } from "vitest";
import { QuoteItemType } from "@/generated/prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  buildItemInsertSql,
  mapAggregateRow,
  mapMatchRow,
} from "./repository";
import type { NormalizedHistoricalItem } from "./types";

describe("historical repository - RPC row mapping", () => {
  it("maps a match row (numeric/date/bigint-friendly) to a typed source", () => {
    const row = {
      item_id: "item-1",
      work_id: "work-1",
      work_ref: "E-01",
      work_date: new Date("2026-01-08T00:00:00.000Z"),
      customer_name: "Juan Pérez",
      plate: "ABC123",
      brand: "Nissan",
      model: "NP300",
      master_name: "Luis",
      item_type: "LABOR",
      description: "Cambiar bujes",
      quantity: null,
      customer_price_cents: 120000,
      payroll_base_cents: 100000,
      rate_percent: 50,
      include_in_payroll: true,
      is_kit: false,
      content_hash: "abc123",
      metadata: { note: "x" },
      similarity: 0.87,
    };
    const source = mapMatchRow(row as unknown as Record<string, unknown>);

    expect(source.workRef).toBe("E-01");
    expect(source.workDate).toBe("2026-01-08");
    expect(source.type).toBe(QuoteItemType.LABOR);
    expect(source.customerPriceCents).toBe(120000);
    expect(source.quantity).toBeNull();
    expect(source.similarity).toBe(0.87);
  });

  it("maps numeric-string quantities (pg numeric) to numbers", () => {
    const source = mapMatchRow({
      item_id: "i",
      work_id: "w",
      work_ref: "E-01",
      work_date: "2026-01-08",
      item_type: "REFACCIONES",
      description: "4 tornillos",
      quantity: "4.00",
      customer_price_cents: 20000,
      include_in_payroll: "false",
      is_kit: "false",
      content_hash: "h",
      similarity: 0.5,
    } as unknown as Record<string, unknown>);
    expect(source.quantity).toBe(4);
    expect(source.includeInPayroll).toBe(false);
  });

  it("maps aggregate rows with bigint columns arriving as strings", () => {
    const row = mapAggregateRow({
      group_key: "all",
      item_count: "12",
      work_count: "3",
      total_customer_cents: "150000",
      total_payroll_base_cents: "100000",
      total_commission_cents: "50000",
      avg_customer_cents: "12500.0000000000000000",
      avg_commission_cents: "4166.6666666666666667",
    } as unknown as Record<string, unknown>);

    expect(row.itemCount).toBe(12);
    expect(row.workCount).toBe(3);
    expect(row.totalCustomerCents).toBe(150000);
    expect(row.totalCommissionCents).toBe(50000);
    expect(row.avgCustomerCents).toBe(12500);
  });
});

describe("historical repository - item insert SQL", () => {
  it("builds an insert that casts the embedding and metadata", () => {
    const item: NormalizedHistoricalItem = {
      type: QuoteItemType.REFACCIONES,
      description: "4 tornillos",
      quantity: 4,
      customerPriceCents: 20000,
      payrollBaseCents: null,
      ratePercent: null,
      includeInPayroll: false,
      isKit: false,
      sortOrder: 0,
      contentHash: "hash123",
      unitPriceCents: 5000,
      commissionCents: null,
      embeddingText: "Refacciones: 4 tornillos",
      embedding: [0.1, 0.2, 0.3],
      metadata: {},
    };

    const sql = buildItemInsertSql("work-1", item);
    const text = sql.text;
    const values = sql.values as unknown[];

    expect(text).toContain('"embedding"');
    expect(text).toContain("CAST(");
    expect(text).toContain("AS vector)");
    expect(text).toContain("AS jsonb");
    expect(values).toContain("work-1");
    expect(values).toContain("[0.1,0.2,0.3]");
    expect(values).toContain("hash123");
  });
});