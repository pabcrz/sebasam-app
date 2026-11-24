import { KnowledgeIndexState, QuoteItemType, QuoteStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    quote: { findUnique: vi.fn(), findMany: vi.fn() },
    quotePriceReferenceSource: { updateMany: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { buildQuotePriceReferenceContext, reindexQuotePriceReferences, synchronizeQuotePriceReferences } from "./service";

const provider = { embedText: vi.fn() };

function quote(overrides: Record<string, unknown> = {}) {
  return {
    status: QuoteStatus.SENT, deletedAt: null, vehicleSnapshot: null, workOrder: null,
    vehicle: { brand: "Nissan", model: "NP300", plate: "ABC-123" },
    items: [{ id: "item-1", type: QuoteItemType.LABOR, description: "Bajar muelles" }],
    ...overrides,
  };
}

describe("quote price reference synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provider.embedText.mockResolvedValue(new Array(1536).fill(0.1));
    prisma.$executeRaw.mockResolvedValue(1);
  });

  it("embeds the concept text without prices", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote());
    prisma.$queryRaw.mockResolvedValue([{ id: "s1", indexState: KnowledgeIndexState.PENDING }]);

    const result = await synchronizeQuotePriceReferences("quote-1", provider);

    expect(result).toEqual({ indexed: 1, failed: 0, skipped: 0 });
    const text = provider.embedText.mock.calls[0][0] as string;
    expect(text).toBe(buildQuotePriceReferenceContext({ unit: "Nissan NP300, Plate ABC-123", type: "LABOR", description: "Bajar muelles" }));
    expect(text).not.toMatch(/\$|price \d|total/i);
  });

  it("does not re-embed an already indexed unchanged source", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote());
    prisma.$queryRaw.mockResolvedValue([{ id: "s1", indexState: KnowledgeIndexState.INDEXED }]);

    expect(await synchronizeQuotePriceReferences("quote-1", provider)).toEqual({ indexed: 0, failed: 0, skipped: 1 });
    expect(provider.embedText).not.toHaveBeenCalled();
  });

  it.each([
    ["cancelled", { status: QuoteStatus.CANCELLED }],
    ["archived", { status: QuoteStatus.ARCHIVED }],
    ["in the trash", { deletedAt: new Date() }],
    ["completed work", { workOrder: { status: WorkOrderStatus.COMPLETED } }],
  ])("marks the projection ineligible when the quote is %s", async (_name, overrides) => {
    prisma.quote.findUnique.mockResolvedValue(quote(overrides));

    await synchronizeQuotePriceReferences("quote-1", provider);

    expect(prisma.quotePriceReferenceSource.updateMany).toHaveBeenCalledWith({
      where: { quoteId: "quote-1" },
      data: { indexState: KnowledgeIndexState.INELIGIBLE, lastIndexError: null },
    });
    expect(provider.embedText).not.toHaveBeenCalled();
  });

  it("stores a provider failure per source instead of throwing", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote());
    prisma.$queryRaw.mockResolvedValue([{ id: "s1", indexState: KnowledgeIndexState.PENDING }]);
    provider.embedText.mockRejectedValue(new Error("quota"));

    expect(await synchronizeQuotePriceReferences("quote-1", provider)).toEqual({ indexed: 0, failed: 1, skipped: 0 });
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });

  it("reindexes only live quotes that are not completed work and totals the results", async () => {
    prisma.quote.findMany.mockResolvedValue([{ id: "quote-1" }]);
    prisma.quote.findUnique.mockResolvedValue(quote());
    prisma.$queryRaw.mockResolvedValue([{ id: "s1", indexState: KnowledgeIndexState.PENDING }]);

    expect(await reindexQuotePriceReferences(provider)).toEqual({ quotes: 1, indexed: 1, failed: 0, skipped: 0 });
    const where = prisma.quote.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.status.in).toEqual([QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED]);
    expect(where.NOT).toEqual({ workOrder: { is: { status: WorkOrderStatus.COMPLETED } } });
  });
});
