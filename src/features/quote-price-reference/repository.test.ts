import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { matchQuotePriceReferences } from "./repository";

describe("quote price reference repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps a row as a quoted price and never exposes income or commission", async () => {
    prisma.$queryRaw.mockResolvedValue([{
      item_id: "i1", quote_id: "q1", quote_number: "C-001", quote_status: "SENT",
      operational_date: new Date("2026-11-02T00:00:00.000Z"), brand: "Nissan", model: "NP300", plate: null,
      item_type: "LABOR", description: "Bajar muelles", quantity: "2.00", unit_price_cents: 50000,
      item_total_cents: 100000, similarity: 0.8,
    }]);

    const [source] = await matchQuotePriceReferences({ embedding: new Array(1536).fill(0) });

    expect(source).toMatchObject({
      provenance: "quote-reference", quoteNumber: "C-001", quoteStatus: "SENT", quotedOn: "2026-11-02",
      quantity: 2, itemTotalCents: 100000,
    });
    expect(source).not.toHaveProperty("generatedCommissionCents");
    expect(source).not.toHaveProperty("currentQuoteTotalCents");
  });

  it("evaluates eligibility against the live quote and applies date and keyword filters", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await matchQuotePriceReferences({
      embedding: new Array(1536).fill(0), keyword: " muelle ",
      dateFrom: new Date("2026-10-01T06:00:00.000Z"), dateTo: new Date("2026-11-01T05:59:59.999Z"),
    });

    const query = prisma.$queryRaw.mock.calls[0][0] as { strings: readonly string[]; values: unknown[] };
    const text = query.strings.join(" ");
    expect(text).toContain('quote."deletedAt" IS NULL');
    expect(text).toContain('quote."status" IN');
    expect(text).toContain('work_order."quoteId" = quote."id"');
    expect(text).toContain('item."description" ILIKE');
    expect(text).toContain('quote."operationalDate" >=');
    expect(query.values).toEqual(expect.arrayContaining(["muelle", "2026-10-01", "2026-10-31"]));
  });
});
