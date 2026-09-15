import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireOperationalRole } from "@/lib/auth/session";
import { getNotePaymentHistory, getPaymentCorrectionDetail, hasActivePaymentApplicationForWorkOrder } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentCorrection: { findFirst: vi.fn() },
    paymentApplication: { count: vi.fn() },
    workOrder: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
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
          payment: { reversedAt: null },
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
