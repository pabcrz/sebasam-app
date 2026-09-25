import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireOperationalRole } from "@/lib/auth/session";
import {
  getEligibleNotesForCreditApplication,
  getNotePaymentHistory,
  getPaymentCorrectionDetail,
  hasActivePaymentApplicationForWorkOrder,
} from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentCorrection: { findFirst: vi.fn() },
    paymentApplication: { count: vi.fn() },
    workOrder: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    payableNote: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/payable-notes/domain", () => ({
  getPayableNotePaymentHistory: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn(),
  requireOperationalRole: vi.fn(),
}));

describe("getPaymentCorrectionDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "admin-1", role: "ADMIN", displayName: "Admin User" },
    });
  });

  it("requires an administrator before reading correction audit data", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(getPaymentCorrectionDetail("pay-1")).rejects.toThrow("Unauthorized");
    expect(prisma.paymentCorrection.findFirst).not.toHaveBeenCalled();
  });

  it("returns original/replacement amounts, methods, actor, reason, timestamp and allocations", async () => {
    const createdAt = new Date("2026-08-25T10:00:00.000Z");
    (prisma.paymentCorrection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "corr-1",
      reason: "Wrong method",
      createdAt,
      actor: { id: "admin-1", displayName: "Admin User" },
      originalPayment: { id: "pay-1", amountCents: 10_000, method: "CASH", operationKey: "op-original" },
      replacementPayment: { id: "pay-2", amountCents: 10_000, method: "TRANSFER", operationKey: "op-replacement" },
      applications: [
        {
          id: "capp-1",
          workOrder: { id: "wo-1", number: "OT-001" },
          originalAmountCents: 8_000,
          replacementAmountCents: 8_000,
          shortfallCents: 0,
        },
      ],
    });

    const detail = await getPaymentCorrectionDetail("pay-1");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(prisma.paymentCorrection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ originalPaymentId: "pay-1" }, { replacementPaymentId: "pay-1" }],
        }),
      }),
    );
    expect(detail).toMatchObject({
      id: "corr-1",
      reason: "Wrong method",
      actor: { id: "admin-1", displayName: "Admin User" },
      originalPayment: { amountCents: 10_000, method: "CASH" },
      replacementPayment: { amountCents: 10_000, method: "TRANSFER" },
      applications: [
        expect.objectContaining({
          workOrder: { id: "wo-1", number: "OT-001" },
          originalAmountCents: 8_000,
          replacementAmountCents: 8_000,
          shortfallCents: 0,
        }),
      ],
    });
  });

  it("returns null when no correction exists for the payment", async () => {
    (prisma.paymentCorrection.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(getPaymentCorrectionDetail("pay-unknown")).resolves.toBeNull();
  });
});

describe("hasActivePaymentApplicationForWorkOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "user-1", role: "OPERATIONS", displayName: "Operations User" },
    });
  });

  it("returns true when an unreversed payment application exists for the work order", async () => {
    (prisma.paymentApplication.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    await expect(hasActivePaymentApplicationForWorkOrder("wo-1")).resolves.toBe(true);
    expect(requireOperationalRole).toHaveBeenCalledOnce();
    expect(prisma.paymentApplication.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workOrderId: "wo-1",
          reversedAt: null,
          payment: { status: "PAID", reversedAt: null },
        }),
      }),
    );
  });

  it("returns false when no active payment application exists", async () => {
    (prisma.paymentApplication.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await expect(hasActivePaymentApplicationForWorkOrder("wo-1")).resolves.toBe(false);
  });
});

describe("getNotePaymentHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as unknown as { payableNote?: unknown }).payableNote = undefined;
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "user-1", role: "OPERATIONS", displayName: "Operations User" },
    });
  });

  it("authorizes before querying and maps registered payments, applications, reversals, credit, and settlement totals", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(getNotePaymentHistory(["wo-1"])).rejects.toThrow("Unauthorized");
    expect(prisma.workOrder.findMany).not.toHaveBeenCalled();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it("uses the actual PayableNote ID for history and keeps the legacy work-order map key", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: "payable-note-actual",
      workOrderId: "wo-legacy-key",
      totalCents: 5_000,
      quote: null,
    }]);
    (prisma as unknown as { payableNote: unknown }).payableNote = { findMany } as never;
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const history = await getNotePaymentHistory(["wo-legacy-key"]);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ id: { in: ["wo-legacy-key"] } }, { workOrderId: { in: ["wo-legacy-key"] } }] },
    }));
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { applications: { some: { payableNoteId: { in: ["payable-note-actual"] } } } },
    }));
    expect(history.get("wo-legacy-key")).toMatchObject({ totalCents: 5000 });
    expect(history.has("payable-note-actual")).toBe(false);
    (prisma.payableNote.findMany as ReturnType<typeof vi.fn>).mockReset();
  });

  it("includes a payment without an application without fabricating note allocation", async () => {
    const firstDate = new Date("2026-09-01T12:00:00.000Z");
    const secondDate = new Date("2026-09-02T12:00:00.000Z");
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "wo-1",
      quoteId: "quote-1",
      quote: {
        subtotalCents: 10_000,
        taxCents: 1_600,
        totalCents: 11_600,
        settlementAgreement: {
          id: "agreement-1",
          status: "ACTIVE",
          settlementBaseCents: 8_000,
          settlementTaxCents: 1_280,
          settlementTotalCents: 9_280,
        },
      },
    }]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "payment-1",
        quoteId: "quote-1",
        amountCents: 5_000,
        createdAt: firstDate,
        method: "CASH",
        status: "PAID",
        reversedAt: null,
        applications: [{ workOrderId: "wo-1", amountCents: 3_000, reversedAt: null }],
      },
      {
        id: "payment-2",
        quoteId: "quote-1",
        amountCents: 2_000,
        createdAt: secondDate,
        method: "TRANSFER",
        status: "PAID",
        reversedAt: null,
        applications: [],
      },
    ]);

    const result = await getNotePaymentHistory(["wo-1"]);
    const history = result.get("wo-1");

    expect(history?.totalCents).toBe(9_280);
    expect(history?.payments).toMatchObject([
      { id: "payment-1", amountCents: 5_000, appliedCents: 3_000, paidCentsAtPayment: 3_000, remainingCentsAtPayment: 6_280 },
      { id: "payment-2", amountCents: 2_000, appliedCents: 0, paidCentsAtPayment: 3_000, remainingCentsAtPayment: 6_280 },
    ]);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { quoteId: { in: ["quote-1"] } } }));
  });

  it("loads multiple note histories with one batch per model and maps ordered balances to each requested note", async () => {
    const firstDate = new Date("2026-09-01T12:00:00.000Z");
    const secondDate = new Date("2026-09-02T12:00:00.000Z");
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "wo-2", quoteId: "quote-2", quote: { subtotalCents: 20_000, taxCents: 0, totalCents: 20_000, settlementAgreement: null } },
      { id: "wo-1", quoteId: "quote-1", quote: { subtotalCents: 10_000, taxCents: 0, totalCents: 10_000, settlementAgreement: null } },
    ]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "payment-wo-1",
        quoteId: "quote-1",
        amountCents: 4_000,
        createdAt: firstDate,
        method: "CASH",
        status: "PAID",
        reversedAt: null,
        correctionsReplacement: [],
        applications: [{ workOrderId: "wo-1", amountCents: 3_000, reversedAt: null }],
      },
      {
        id: "payment-wo-2",
        quoteId: "quote-2",
        amountCents: 6_000,
        createdAt: secondDate,
        method: "TRANSFER",
        status: "PAID",
        reversedAt: null,
        correctionsReplacement: [{ id: "correction-1" }],
        applications: [{ workOrderId: "wo-2", amountCents: 5_000, reversedAt: null }],
      },
    ]);

    const result = await getNotePaymentHistory(["wo-1", "wo-2"]);

    expect(prisma.workOrder.findMany).toHaveBeenCalledOnce();
    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["wo-1", "wo-2"] } } }));
    expect(prisma.payment.findMany).toHaveBeenCalledOnce();
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { quoteId: { in: ["quote-2", "quote-1"] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: expect.objectContaining({
        applications: expect.objectContaining({ where: { workOrderId: { in: ["wo-1", "wo-2"] } } }),
      }),
    }));
    expect([...result.keys()]).toEqual(["wo-2", "wo-1"]);
    expect(result.get("wo-1")).toMatchObject({
      totalCents: 10_000,
      payments: [{ id: "payment-wo-1", appliedCents: 3_000, paidCentsAtPayment: 3_000, remainingCentsAtPayment: 7_000, isReversed: false, isCorrected: false }],
    });
    expect(result.get("wo-2")).toMatchObject({
      totalCents: 20_000,
      payments: [{ id: "payment-wo-2", appliedCents: 5_000, paidCentsAtPayment: 5_000, remainingCentsAtPayment: 15_000, isReversed: false, isCorrected: true }],
    });
  });

  it("batches payable-note lookup and payment-history reads for multiple requested work orders", async () => {
    const payableNotes = [
      {
        id: "note-1",
        workOrderId: "wo-1",
        totalCents: 10_000,
        quote: {
          subtotalCents: 10_000,
          taxCents: 1_600,
          totalCents: 11_600,
          settlementAgreement: {
            id: "agreement-1",
            status: "ACTIVE",
            settlementBaseCents: 8_000,
            settlementTaxCents: 1_280,
            settlementTotalCents: 9_280,
          },
        },
      },
      { id: "note-2", workOrderId: "wo-2", totalCents: 20_000 },
    ];
    (prisma as unknown as { payableNote: unknown }).payableNote = {
      findMany: vi.fn(async () => payableNotes),
    } as never;
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "paid-1", amountCents: 3_000, createdAt: new Date("2026-09-01"), method: "CASH", status: "PAID", reversedAt: null, correctionsReplacement: [], applications: [{ payableNoteId: "note-1", amountCents: 3_000, reversedAt: null }] },
      { id: "paid-2", amountCents: 5_000, createdAt: new Date("2026-09-01"), method: "TRANSFER", status: "PAID", reversedAt: null, correctionsReplacement: [], applications: [{ payableNoteId: "note-2", amountCents: 5_000, reversedAt: null }] },
      { id: "reversed-1", amountCents: 2_000, createdAt: new Date("2026-09-02"), method: "CASH", status: "PAID", reversedAt: new Date("2026-09-03"), correctionsReplacement: [], applications: [{ payableNoteId: "note-1", amountCents: 2_000, reversedAt: new Date("2026-09-03") }] },
      { id: "pending-2", amountCents: 2_000, createdAt: new Date("2026-09-02"), method: "CASH", status: "PENDING", reversedAt: null, correctionsReplacement: [], applications: [{ payableNoteId: "note-2", amountCents: 2_000, reversedAt: null }] },
      { id: "corrected-1", amountCents: 1_000, createdAt: new Date("2026-09-04"), method: "TRANSFER", status: "PAID", reversedAt: null, correctionsReplacement: [{ id: "correction-1" }], applications: [{ payableNoteId: "note-1", amountCents: 0, reversedAt: null }] },
    ]);

    const result = await getNotePaymentHistory(["wo-1", "wo-2", "wo-missing", "wo-1"]);

    expect({
      payableNoteLookups: (prisma.payableNote.findMany as ReturnType<typeof vi.fn>).mock.calls.length,
      paymentHistoryReads: (prisma.payment.findMany as ReturnType<typeof vi.fn>).mock.calls.length,
    }).toEqual({ payableNoteLookups: 1, paymentHistoryReads: 1 });
    expect(prisma.payableNote.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ id: { in: ["wo-1", "wo-2", "wo-missing"] } }, { workOrderId: { in: ["wo-1", "wo-2", "wo-missing"] } }] },
    }));
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { applications: { some: { payableNoteId: { in: ["note-1", "note-2"] } } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }));
    expect([...result.keys()]).toEqual(["wo-1", "wo-2"]);
    expect(result.get("wo-1")).toMatchObject({
      totalCents: 9_280,
      payments: [
        { id: "paid-1", appliedCents: 3_000, paidCentsAtPayment: 3_000, remainingCentsAtPayment: 6_280, isReversed: false, isCorrected: false },
        { id: "reversed-1", appliedCents: 0, paidCentsAtPayment: 3_000, remainingCentsAtPayment: 6_280, isReversed: true },
        { id: "corrected-1", appliedCents: 0, paidCentsAtPayment: 3_000, remainingCentsAtPayment: 6_280, isCorrected: true },
      ],
    });
    expect(result.get("wo-2")).toMatchObject({
      totalCents: 20_000,
      payments: [
        { id: "paid-2", appliedCents: 5_000, paidCentsAtPayment: 5_000, remainingCentsAtPayment: 15_000 },
        { id: "pending-2", appliedCents: 0, paidCentsAtPayment: 5_000, remainingCentsAtPayment: 15_000, paymentStatus: "PENDING" },
      ],
    });
  });

  it("uses a standalone SALE note's stored total", async () => {
    (prisma as unknown as { payableNote: unknown }).payableNote = {
      findMany: vi.fn().mockResolvedValue([{ id: "sale-note-1", workOrderId: null, totalCents: 7_650, quote: null }]),
    } as never;
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getNotePaymentHistory(["sale-note-1"]);

    expect(result.get("sale-note-1")).toEqual({ totalCents: 7_650, payments: [] });
    expect(prisma.payment.findMany).toHaveBeenCalledOnce();
  });

  it("returns no histories for empty or unknown IDs and deduplicates requested IDs", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await expect(getNotePaymentHistory([])).resolves.toEqual(new Map());
    expect(prisma.workOrder.findMany).not.toHaveBeenCalled();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();

    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockClear();
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockClear();
    await expect(getNotePaymentHistory(["unknown", "unknown"])).resolves.toEqual(new Map());
    expect(prisma.workOrder.findMany).toHaveBeenCalledOnce();
    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["unknown"] } } }));
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it("does not count a reversed original alongside its replacement", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "wo-1",
      quoteId: "quote-1",
      quote: { subtotalCents: 10_000, taxCents: 0, totalCents: 10_000, settlementAgreement: null },
    }]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "original", quoteId: "quote-1", amountCents: 10_000, createdAt: new Date("2026-09-01"), method: "CASH", status: "PAID", reversedAt: new Date("2026-09-02"), applications: [{ workOrderId: "wo-1", amountCents: 10_000, reversedAt: new Date("2026-09-02") }] },
      { id: "replacement", quoteId: "quote-1", amountCents: 10_000, createdAt: new Date("2026-09-02"), method: "TRANSFER", status: "PAID", reversedAt: null, applications: [{ workOrderId: "wo-1", amountCents: 10_000, reversedAt: null }] },
    ]);

    const history = (await getNotePaymentHistory(["wo-1"])).get("wo-1");

    expect(history?.payments.map((payment) => payment.paidCentsAtPayment)).toEqual([0, 10_000]);
    expect(history?.payments.map((payment) => payment.isReversed)).toEqual([true, false]);
  });

  it("retains the reversed original and corrected replacement for internal history", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "wo-1",
      quoteId: "quote-1",
      quote: { subtotalCents: 10_000, taxCents: 0, totalCents: 10_000, settlementAgreement: null },
    }]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "original",
        quoteId: "quote-1",
        amountCents: 10_000,
        createdAt: new Date("2026-09-01"),
        method: "CASH",
        status: "PAID",
        reversedAt: new Date("2026-09-02"),
        applications: [{ workOrderId: "wo-1", amountCents: 10_000, reversedAt: new Date("2026-09-02") }],
      },
      {
        id: "replacement",
        quoteId: "quote-1",
        amountCents: 10_000,
        createdAt: new Date("2026-09-02"),
        method: "TRANSFER",
        status: "PAID",
        reversedAt: null,
        applications: [{ workOrderId: "wo-1", amountCents: 10_000, reversedAt: null }],
      },
    ]);

    const history = (await getNotePaymentHistory(["wo-1"])).get("wo-1");

    expect(history?.payments).toMatchObject([
      { id: "original", method: "CASH", isReversed: true, appliedCents: 0 },
      { id: "replacement", method: "TRANSFER", isReversed: false, appliedCents: 10_000 },
    ]);
  });

  it("does not label pending or failed payments as reversed without a reversal timestamp", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
      id: "wo-1",
      quoteId: "quote-1",
      quote: { subtotalCents: 10_000, taxCents: 0, totalCents: 10_000, settlementAgreement: null },
    }]);
    (prisma.payment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "pending", quoteId: "quote-1", amountCents: 3_000, createdAt: new Date("2026-09-01"), method: "TRANSFER", status: "PENDING", reversedAt: null, applications: [{ workOrderId: "wo-1", amountCents: 3_000, reversedAt: null }] },
      { id: "failed", quoteId: "quote-1", amountCents: 2_000, createdAt: new Date("2026-09-02"), method: "TRANSFER", status: "FAILED", reversedAt: null, applications: [] },
    ]);

    const history = (await getNotePaymentHistory(["wo-1"])).get("wo-1");

    expect(history?.payments.map((payment) => payment.isReversed)).toEqual([false, false]);
    expect(history?.payments.map((payment) => payment.appliedCents)).toEqual([0, 0]);
    expect(history?.payments.map((payment) => payment.paidCentsAtPayment)).toEqual([0, 0]);
    expect(history?.payments.map((payment) => payment.paymentStatus)).toEqual(["PENDING", "FAILED"]);
  });
});

describe("getEligibleNotesForCreditApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "user-1", role: "OPERATIONS", displayName: "Operations User" },
    });
  });

  it("only maps active applications from paid payments into the eligible Note balance", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wo-1",
        number: "OT-001",
        completedAt: new Date("2026-09-01"),
        quote: { subtotalCents: 10_000, taxCents: 0, totalCents: 10_000, settlementAgreement: null },
        paymentApplications: [{ amountCents: 4_000 }],
      },
    ]);

    const result = await getEligibleNotesForCreditApplication("cust-1");

    expect(result[0]).toMatchObject({ appliedCents: 4_000, pendingBalanceCents: 6_000 });
    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        paymentApplications: {
          where: { reversedAt: null, payment: { status: "PAID", reversedAt: null } },
          select: { amountCents: true },
        },
      }),
    }));
  });
});
