import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processQuoteRetention } from "./retention";

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

type RetentionTransaction = {
  quote: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  sharedQuote: { updateMany: ReturnType<typeof vi.fn> };
  workOrder: { count: ReturnType<typeof vi.fn> };
  payableNote: { count: ReturnType<typeof vi.fn> };
  payment: { count: ReturnType<typeof vi.fn> };
  paymentRequest: { count: ReturnType<typeof vi.fn> };
  quoteDecision: { count: ReturnType<typeof vi.fn> };
  quoteLifecycleEvent: { count: ReturnType<typeof vi.fn> };
  quoteCommercialCorrection: { count: ReturnType<typeof vi.fn> };
  settlementAgreement: { count: ReturnType<typeof vi.fn> };
};

function mockTransaction(): RetentionTransaction {
  const tx: RetentionTransaction = {
    quote: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn(),
    },
    sharedQuote: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    workOrder: { count: vi.fn().mockResolvedValue(0) },
    payableNote: { count: vi.fn().mockResolvedValue(0) },
    payment: { count: vi.fn().mockResolvedValue(0) },
    paymentRequest: { count: vi.fn().mockResolvedValue(0) },
    quoteDecision: { count: vi.fn().mockResolvedValue(0) },
    quoteLifecycleEvent: { count: vi.fn().mockResolvedValue(0) },
    quoteCommercialCorrection: { count: vi.fn().mockResolvedValue(0) },
    settlementAgreement: { count: vi.fn().mockResolvedValue(0) },
  };
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never) as never);
  return tx;
}

describe("processQuoteRetention", () => {
  beforeEach(() => vi.clearAllMocks());

  it("archives expired SENT/APPROVED quotes and revokes their public links", async () => {
    const tx = mockTransaction();
    const now = new Date("2026-10-01T00:00:00.000Z");
    tx.quote.findMany.mockResolvedValueOnce([{ id: "quote-expired", status: QuoteStatus.SENT }]);
    tx.quote.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(processQuoteRetention(now)).resolves.toEqual({ archived: 1, trashed: 0, purged: 0, protected: 0 });

    expect(tx.quote.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        status: { in: [QuoteStatus.SENT, QuoteStatus.APPROVED] },
        validUntil: { lte: now },
        deletedAt: null,
        workOrder: { is: null },
        payableNote: { is: null },
      }),
      take: expect.any(Number),
    }));
    expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "quote-expired", status: QuoteStatus.SENT, deletedAt: null }),
      data: { status: QuoteStatus.ARCHIVED },
    }));
    expect(tx.sharedQuote.updateMany).toHaveBeenCalledWith({
      where: { quoteId: "quote-expired", revokedAt: null },
      data: { revokedAt: now },
    });
  });

  it("starts trash at validUntil plus 30 days even when the scheduled run is late", async () => {
    const tx = mockTransaction();
    const now = new Date("2026-11-15T00:00:00.000Z");
    tx.quote.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "quote-archived", validUntil: new Date("2026-10-01T00:00:00.000Z") }]);
    tx.quote.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(processQuoteRetention(now)).resolves.toMatchObject({ archived: 0, trashed: 1 });

    expect(tx.quote.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({
        status: QuoteStatus.ARCHIVED,
        deletedAt: null,
        validUntil: { lte: new Date("2026-10-16T00:00:00.000Z") },
      }),
    }));
    expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "quote-archived", status: QuoteStatus.ARCHIVED, deletedAt: null }),
      data: { deletedAt: new Date("2026-10-31T00:00:00.000Z") },
    }));
  });

  it("hard-deletes trashed quotes only after validUntil plus 60 days and when no protected dependencies remain", async () => {
    const tx = mockTransaction();
    const now = new Date("2026-12-01T00:00:00.000Z");
    tx.quote.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "quote-expired-trash", validUntil: new Date("2026-10-01T00:00:00.000Z") }]);

    await expect(processQuoteRetention(now)).resolves.toMatchObject({ purged: 1, protected: 0 });

    expect(tx.quote.findMany).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: expect.objectContaining({
        status: QuoteStatus.ARCHIVED,
        deletedAt: { not: null },
        validUntil: { lte: new Date("2026-10-02T00:00:00.000Z") },
      }),
    }));
    expect(tx.quote.delete).toHaveBeenCalledWith({ where: { id: "quote-expired-trash" } });
  });

  it.each([
    ["work orders", "workOrder"],
    ["Notes", "payableNote"],
    ["payments", "payment"],
    ["payment requests", "paymentRequest"],
    ["decisions", "quoteDecision"],
    ["lifecycle audit events", "quoteLifecycleEvent"],
    ["commercial corrections", "quoteCommercialCorrection"],
    ["settlement agreements", "settlementAgreement"],
  ] as const)("keeps trashed quotes with %s protected from purge", async (_label, dependency) => {
    const tx = mockTransaction();
    const now = new Date("2026-12-01T00:00:00.000Z");
    tx.quote.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "protected-quote", validUntil: new Date("2026-10-01T00:00:00.000Z") }]);
    tx[dependency].count.mockResolvedValue(1);

    await expect(processQuoteRetention(now)).resolves.toMatchObject({ purged: 0, protected: 1 });

    expect(tx.quote.delete).not.toHaveBeenCalled();
  });

  it("limits each phase to a bounded batch", async () => {
    const tx = mockTransaction();

    await processQuoteRetention(new Date("2026-10-01T00:00:00.000Z"));

    for (const [args] of tx.quote.findMany.mock.calls) {
      expect(args.take).toBeGreaterThan(0);
      expect(args.take).toBeLessThanOrEqual(100);
    }
  });
});
