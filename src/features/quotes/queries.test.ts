import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { listArchivedEligibleQuotes, listPaginatedQuotes, listQuotes, listQuotesByIds, listRecoverableTrashedQuotes } from "./queries";
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

  it("lists eligible archived quotes behind operational-role authorization", async () => {
    const { requireOperationalRole } = await import("@/lib/auth/session");
    await listArchivedEligibleQuotes();
    expect(requireOperationalRole).toHaveBeenCalled();
    expect(getFindManyCall().where).toEqual({
      status: "ARCHIVED",
      deletedAt: null,
      retentionStartedAt: { not: null },
    });
  });

  it("limits the trash list to the recoverable 30-day retention window", async () => {
    const now = new Date("2026-10-31T12:00:00.000Z");
    await listRecoverableTrashedQuotes(now);
    expect(getFindManyCall().where).toEqual({
      status: "ARCHIVED",
      retentionStartedAt: { not: null },
      deletedAt: { gte: new Date("2026-10-01T12:00:00.000Z"), lte: now },
    });
  });

  it("returns quotes without cancelled or archived when no filters are provided", async () => {
    await listQuotes();

    const call = getFindManyCall();
    expect(call.where).toEqual({ deletedAt: null, status: { notIn: ["CANCELLED", "ARCHIVED"] } });
  });

  it("filters by status", async () => {
    await listQuotes({ deletedAt: null, status: "APPROVED" });

    const call = getFindManyCall();
    expect(call.where).toEqual({ deletedAt: null, status: "APPROVED" });
  });

  it("ignores invalid status values but still hides cancelled by default", async () => {
    await listQuotes({ status: "INVALID" });

    const call = getFindManyCall();
    expect(call.where).toEqual({ deletedAt: null, status: { notIn: ["CANCELLED", "ARCHIVED"] } });
  });

  it("shows cancelled when showCancelled is true", async () => {
    await listQuotes({ showCancelled: true });

    const call = getFindManyCall();
    expect(call.where).toEqual({ deletedAt: null, status: { notIn: ["ARCHIVED"] } });
  });

  it("shows archived without changing the cancelled filter", async () => {
    await listQuotes({ showArchived: true });

    expect(getFindManyCall().where).toEqual({ deletedAt: null, status: { notIn: ["CANCELLED"] } });
  });

  it("keeps drafts without an excluded work order in Cotizaciones and excludes later operational queues", async () => {
    await listPaginatedQuotes({}, { operationalQueue: "quotes" });

    expect(getFindManyCall().where).toEqual({
      deletedAt: null,
      status: { in: ["DRAFT", "SENT", "APPROVED"] },
      NOT: {
        workOrder: {
          status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] },
        },
      },
    });
    expect(getFindManyCall().where.NOT.workOrder.status.in).not.toContain("PLANNED");
  });

  it("respects explicit status filter in operationalQueue", async () => {
    await listPaginatedQuotes({ status: "REJECTED" }, { operationalQueue: "quotes" });

    expect(getFindManyCall().where).toMatchObject({
      status: "REJECTED",
    });
  });

  it("includes cancelled quotes in operationalQueue when showCancelled is true", async () => {
    await listPaginatedQuotes({ showCancelled: true }, { operationalQueue: "quotes" });

    expect(getFindManyCall().where).toMatchObject({
      status: { in: ["DRAFT", "SENT", "APPROVED", "CANCELLED"] },
    });
  });

  it("includes archived quotes in operationalQueue when showArchived is true", async () => {
    await listPaginatedQuotes({ showArchived: true }, { operationalQueue: "quotes" });

    expect(getFindManyCall().where).toMatchObject({
      status: { in: ["DRAFT", "SENT", "APPROVED", "ARCHIVED"] },
    });
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
where: { deletedAt: null, customerId: "cust-1", status: { notIn: ["ARCHIVED"] } },
      orderBy: [{ operationalDate: "desc" }, { id: "desc" }],
      skip: 20,
      take: 21,
    });
    expect(result).toMatchObject({ page: 2, hasNextPage: true });
    expect(result.quotes).toHaveLength(20);
  });

  it("hydrates the complete quote payload with one joined relation query and one paid-total query", async () => {
    const relationPayload = {
      customer: { id: "cust-1", fiscalProfiles: [{ id: "fiscal-1" }] },
      vehicle: { id: "vehicle-1", plate: "ABC-123" },
      workOrder: {
        id: "work-order-1",
        assignments: [{ id: "assignment-1", worker: { id: "worker-1" } }],
        executionRecords: [{ id: "execution-1", worker: { id: "worker-1" } }],
      },
      sharedQuotes: [{ id: "shared-1", expiresAt: new Date("2099-01-01"), revokedAt: null }],
      paymentRequests: [{ id: "request-1", status: "PENDING" }],
    };
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "quote-1",
      number: "C-001",
      subtotalCents: 10000,
      taxCents: 1600,
      totalCents: 11600,
      items: [{ id: "root-item", quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
      sections: [{
        id: "section-1",
        items: [{ id: "section-item", quantity: 2, unitPriceCents: 4500, totalCents: 9000 }],
      }],
      ...relationPayload,
    }]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map([["quote-1", 1600]]));

    const result = await listPaginatedQuotes();

    const call = getFindManyCall();
    expect(prisma.quote.findMany).toHaveBeenCalledTimes(1);
    expect(getQuotePaidTotals).toHaveBeenCalledTimes(1);
    expect(call.relationLoadStrategy).toBe("join");
    expect(call.include).toMatchObject({
      customer: {
        include: {
          fiscalProfiles: {
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: { id: true, businessName: true, taxId: true },
          },
        },
      },
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
      workOrder: {
        include: {
          assignments: { include: { worker: true } },
          executionRecords: {
            include: { worker: true },
            orderBy: { happenedAt: "desc" },
          },
        },
      },
      sharedQuotes: true,
      paymentRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          requiresInvoice: true,
          customerFiscalProfileId: true,
          fiscalSnapshot: true,
        },
      },
    });
    expect(getQuotePaidTotals).toHaveBeenCalledWith(["quote-1"]);
    expect(result.quotes[0]).toMatchObject({
      ...relationPayload,
      subtotalCents: 10000,
      taxCents: 1600,
      totalCents: 11600,
      paidCents: 1600,
      remainingCents: 10000,
      items: [{ id: "root-item", quantity: 1, unitPriceCents: 1000, totalCents: 1000 }],
      sections: [{
        id: "section-1",
        items: [{ id: "section-item", quantity: 2, unitPriceCents: 4500, totalCents: 9000 }],
      }],
      activeSharedQuote: relationPayload.sharedQuotes[0],
    });
  });

  it("lists only the requested ids", async () => {
    await listQuotesByIds(["quote-1", "quote-2"]);

    const call = getFindManyCall();
    expect(call.where).toEqual({
      id: { in: ["quote-1", "quote-2"] },
      deletedAt: null,
    });
  });

  it("does not turn invalid ids into an unfiltered quote query", async () => {
    await expect(listQuotesByIds([])).resolves.toEqual([]);

    expect(prisma.quote.findMany).not.toHaveBeenCalled();
    expect(getQuotePaidTotals).not.toHaveBeenCalled();
  });

  it("does not serialize an unrelated historical overpayment", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "active-quote",
      number: "C-ACTIVE",
      totalCents: 10000,
      subtotalCents: 10000,
      taxCents: 0,
      sections: [],
      items: [],
      sharedQuotes: [],
    }]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map([["active-quote", 10000]]));

    await expect(listQuotesByIds(["active-quote"])).resolves.toHaveLength(1);
    expect(getQuotePaidTotals).toHaveBeenCalledWith(["active-quote"]);
  });

  it("filters by customerId", async () => {
    await listQuotes({ customerId: "cust-1" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      customerId: "cust-1",
      deletedAt: null,
      status: { notIn: ["CANCELLED", "ARCHIVED"] },
    });
  });

  it("filters by number with insensitive contains", async () => {
    await listQuotes({ number: "C-001" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      deletedAt: null,
      status: { notIn: ["CANCELLED", "ARCHIVED"] },
      OR: [
        { number: { contains: "C-001", mode: "insensitive" } },
        { folio: { contains: "C-001", mode: "insensitive" } },
      ],
    });
  });

  it("filters by plate on vehicle and snapshot", async () => {
    await listQuotes({ plate: "ABC-123" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      OR: [
        { vehicle: { plate: { contains: "ABC-123", mode: "insensitive" } } },
        { vehicleSnapshot: { path: ["plate"], string_contains: "ABC-123" } },
      ],
      deletedAt: null,
      status: { notIn: ["CANCELLED", "ARCHIVED"] },
    });
  });

  it("filters by economicNumber on vehicle and snapshot", async () => {
    await listQuotes({ economicNumber: "ECO-42" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      OR: [
        { vehicle: { economicNumber: { contains: "ECO-42", mode: "insensitive" } } },
        { vehicleSnapshot: { path: ["economicNumber"], string_contains: "ECO-42" } },
      ],
      deletedAt: null,
      status: { notIn: ["CANCELLED", "ARCHIVED"] },
    });
  });

  it("filters by plate and economicNumber using AND", async () => {
    await listQuotes({ plate: "ABC-123", economicNumber: "ECO-42" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      AND: [
        {
          OR: [
            { vehicle: { plate: { contains: "ABC-123", mode: "insensitive" } } },
            { vehicleSnapshot: { path: ["plate"], string_contains: "ABC-123" } },
          ],
        },
        {
          OR: [
            { vehicle: { economicNumber: { contains: "ECO-42", mode: "insensitive" } } },
            { vehicleSnapshot: { path: ["economicNumber"], string_contains: "ECO-42" } },
          ],
        },
      ],
      deletedAt: null,
      status: { notIn: ["CANCELLED", "ARCHIVED"] },
    });
  });

  it("filters by date range", async () => {
    await listQuotes({ dateFrom: "2026-07-01", dateTo: "2026-07-31" });

    const call = getFindManyCall();
    const gte = call.where.operationalDate.gte as Date;
    expect(gte.getUTCFullYear()).toBe(2026);
    expect(gte.getUTCMonth()).toBe(6);
    expect(gte.getUTCDate()).toBe(1);
    expect(gte.getUTCHours()).toBe(0);
    const lte = call.where.operationalDate.lte as Date;
    expect(lte.getUTCFullYear()).toBe(2026);
    expect(lte.getUTCMonth()).toBe(6);
    expect(lte.getUTCDate()).toBe(31);
    expect(lte.getUTCHours()).toBe(0);
    expect(lte.getUTCMinutes()).toBe(0);
    expect(lte.getUTCSeconds()).toBe(0);
    expect(lte.getUTCMilliseconds()).toBe(0);
  });

  it("combines multiple filters", async () => {
    await listQuotes({ deletedAt: null, status: "DRAFT", customerId: "cust-1", number: "C-001" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      deletedAt: null,
      status: "DRAFT",
      customerId: "cust-1",
      OR: [
        { number: { contains: "C-001", mode: "insensitive" } },
        { folio: { contains: "C-001", mode: "insensitive" } },
      ],
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
