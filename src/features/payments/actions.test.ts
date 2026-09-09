import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { correctPayment, recordCashPayment, reversePaymentCapture } from "./domain";
import { correctPaymentAction, recordPaymentAction, reversePaymentCaptureAction } from "./actions";

vi.mock("@/lib/auth/session", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { workOrder: { findUnique: vi.fn() } } }));
vi.mock("./domain", async () => ({
  ...(await vi.importActual<typeof import("./domain")>("./domain")),
  correctPayment: vi.fn(),
  recordCashPayment: vi.fn(),
  reversePaymentCapture: vi.fn(),
}));

describe("recordPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      quoteId: "quote-1",
      status: "COMPLETED",
    });
  });

  it("requires an administrator and records a completed note against its quote", async () => {
    (recordCashPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "payment-1" });

    await recordPaymentAction("work-order-1", "123.45", "payment-operation-1", "CASH");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(prisma.workOrder.findUnique).toHaveBeenCalledWith({
      where: { id: "work-order-1" },
      select: { quoteId: true, status: true },
    });
    expect(recordCashPayment).toHaveBeenCalledWith({
      quoteId: "quote-1",
      amountCents: 12345,
      operationKey: "payment-operation-1",
      method: "CASH",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
  });

  it.each([
    ["partial", "12.50", 1250],
    ["total", "100.00", 10000],
  ])("preserves the exact cents for a %s payment", async (_kind, amount, amountCents) => {
    (recordCashPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "payment-1" });

    await recordPaymentAction("work-order-1", amount, "payment-operation-1", "CASH");

    expect(recordCashPayment).toHaveBeenCalledWith(expect.objectContaining({
      quoteId: "quote-1",
      amountCents,
    }));
  });

  it("does not call the domain for invalid form amounts", async () => {
    await expect(recordPaymentAction("work-order-1", "1.999", "payment-operation-1", "CASH")).rejects.toThrow(
      "Ingresa un monto válido con hasta dos decimales.",
    );

    expect(recordCashPayment).not.toHaveBeenCalled();
  });

  it("rejects payment registration outside completed Notes", async () => {
    (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      quoteId: "quote-1",
      status: "IN_PROGRESS",
    });

    await expect(recordPaymentAction("work-order-1", "10", "payment-operation-1", "CASH")).rejects.toThrow(
      "Solo se pueden registrar pagos desde notas de trabajos completados.",
    );

    expect(recordCashPayment).not.toHaveBeenCalled();
  });
});

describe("reversePaymentCaptureAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "admin-user-1" },
    });
  });

  it("requires admin session and calls domain reversePaymentCapture with actorId", async () => {
    (reversePaymentCapture as ReturnType<typeof vi.fn>).mockResolvedValue({
      paymentId: "pay-1",
      reversedApplicationsCount: 1,
      restoredCustomerCreditCents: 5000,
    });

    const result = await reversePaymentCaptureAction("pay-1", "Error de captura", "op-rev-1");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(reversePaymentCapture).toHaveBeenCalledWith({
      paymentId: "pay-1",
      reason: "Error de captura",
      actorId: "admin-user-1",
      operationKey: "op-rev-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/work-orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/notas");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/customers");
    expect(result).toEqual({
      paymentId: "pay-1",
      reversedApplicationsCount: 1,
      restoredCustomerCreditCents: 5000,
    });
  });
});

describe("correctPaymentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "admin-user-1" },
    });
  });

  it("requires admin and maps amount, method and reason to the domain correction", async () => {
    (correctPayment as ReturnType<typeof vi.fn>).mockResolvedValue({
      correctionId: "corr-1",
      originalPaymentId: "pay-1",
      replacementPaymentId: "pay-2",
      replacementAmountCents: 12500,
      method: "TRANSFER",
    });

    const result = await correctPaymentAction("pay-1", "125.00", "TRANSFER", "Fix method", "op-correct-1");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(correctPayment).toHaveBeenCalledWith({
      originalPaymentId: "pay-1",
      amountCents: 12500,
      method: "TRANSFER",
      reason: "Fix method",
      operationKey: "op-correct-1",
      actorId: "admin-user-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
    expect(result.replacementAmountCents).toBe(12500);
  });

  it("rejects non-admin callers before touching the domain", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(correctPaymentAction("pay-1", "100.00", "CASH", "Reason", "op-1")).rejects.toThrow("Unauthorized");
    expect(correctPayment).not.toHaveBeenCalled();
  });
});
