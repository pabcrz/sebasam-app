import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireOperationalRole } from "@/lib/auth/session";
import { getPaymentCorrectionDetail, hasActivePaymentApplicationForWorkOrder } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentCorrection: { findFirst: vi.fn() },
    paymentApplication: { count: vi.fn() },
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
