import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { listPaginatedQuotes, listQuotes } from "./queries";
import { getQuotePaidTotals } from "@/features/payments/queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quote: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("@/features/payments/queries", () => ({
  getQuotePaidTotals: vi.fn(),
}));

function getFindManyCall() {
  return (prisma.quote.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe("listQuotes filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());
  });

  it("returns quotes without cancelled when no filters are provided", async () => {
    await listQuotes();

    const call = getFindManyCall();
    expect(call.where).toEqual({ status: { not: "CANCELLED" } });
  });

  it("filters by status", async () => {
    await listQuotes({ status: "APPROVED" });

    const call = getFindManyCall();
    expect(call.where).toEqual({ status: "APPROVED" });
  });

  it("ignores invalid status values but still hides cancelled by default", async () => {
    await listQuotes({ status: "INVALID" });

    const call = getFindManyCall();
    expect(call.where).toEqual({ status: { not: "CANCELLED" } });
  });

  it("shows cancelled when showCancelled is true", async () => {
    await listQuotes({ showCancelled: true });

    const call = getFindManyCall();
    expect(call.where).toBeUndefined();
  });

  it("paginates newest-first while preserving filters", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        id: `quote-${index}`,
        totalCents: 10000,
        subtotalCents: 10000,
        taxCents: 0,
        sections: [],
        items: [],
        sharedQuotes: [],
      })),
    );

    const result = await listPaginatedQuotes({ page: "2", customerId: "cust-1", showCancelled: true });

    expect(getFindManyCall()).toMatchObject({
      where: { customerId: "cust-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 20,
      take: 21,
    });
    expect(result).toMatchObject({ page: 2, hasNextPage: true });
    expect(result.quotes).toHaveLength(20);
  });

  it("includes root and section items in the paginated list payload", async () => {
    await listPaginatedQuotes();

    const call = getFindManyCall();
    expect(call.include.items).toBeDefined();
    expect(call.include.sections).toBeDefined();
  });

  it("filters by customerId", async () => {
    await listQuotes({ customerId: "cust-1" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      customerId: "cust-1",
      status: { not: "CANCELLED" },
    });
  });

  it("filters by number with insensitive contains", async () => {
    await listQuotes({ number: "C-001" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      number: { contains: "C-001", mode: "insensitive" },
      status: { not: "CANCELLED" },
    });
  });

  it("filters by plate on vehicle and snapshot", async () => {
    await listQuotes({ plate: "ABC-123" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      OR: [
        { vehicle: { plate: { contains: "ABC-123", mode: "insensitive" } } },
        { vehicleSnapshot: { path: ["plate"], string_contains: "ABC-123", mode: "insensitive" } },
      ],
      status: { not: "CANCELLED" },
    });
  });

  it("filters by date range", async () => {
    await listQuotes({ dateFrom: "2026-07-01", dateTo: "2026-07-31" });

    const call = getFindManyCall();
    const gte = call.where.createdAt.gte as Date;
    expect(gte.getFullYear()).toBe(2026);
    expect(gte.getMonth()).toBe(6);
    expect(gte.getDate()).toBe(1);
    expect(gte.getHours()).toBe(0);
    const lte = call.where.createdAt.lte as Date;
    expect(lte.getFullYear()).toBe(2026);
    expect(lte.getMonth()).toBe(6);
    expect(lte.getDate()).toBe(31);
    expect(lte.getHours()).toBe(23);
    expect(lte.getMinutes()).toBe(59);
    expect(lte.getSeconds()).toBe(59);
    expect(lte.getMilliseconds()).toBe(999);
  });

  it("combines multiple filters", async () => {
    await listQuotes({ status: "DRAFT", customerId: "cust-1", number: "C-001" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      status: "DRAFT",
      customerId: "cust-1",
      number: { contains: "C-001", mode: "insensitive" },
    });
  });

  it("adds paid and remaining cents without changing quote status", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "quote-1",
      totalCents: 10000,
      subtotalCents: 10000,
      taxCents: 0,
      sections: [],
      items: [],
      sharedQuotes: [],
    }]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map([["quote-1", 2500]]));

    const quotes = await listQuotes();

    expect(quotes[0]).toMatchObject({
      totalCents: 10000,
      paidCents: 2500,
      remainingCents: 7500,
    });
  });

  it("keeps the paid abono represented when a quote is settled", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "quote-1",
      number: "C-001",
      totalCents: 10000,
      subtotalCents: 10000,
      taxCents: 0,
      sections: [],
      items: [],
      sharedQuotes: [],
    }]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map([["quote-1", 10000]]));

    const quotes = await listQuotes();

    expect(quotes[0]).toMatchObject({
      totalCents: 10000,
      paidCents: 10000,
      remainingCents: 0,
    });
  });

  it("throws instead of masking a paid amount greater than the quote total", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "quote-1",
      number: "C-001",
      totalCents: 10000,
      subtotalCents: 10000,
      taxCents: 0,
      sections: [],
      items: [],
      sharedQuotes: [],
    }]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map([["quote-1", 10001]]));

    await expect(listQuotes()).rejects.toThrow(
      "Los pagos registrados exceden el total de la cotización C-001.",
    );
  });
});
