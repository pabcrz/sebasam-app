import { beforeEach, describe, expect, it, vi } from "vitest";

const { setPreference, revalidatePath } = vi.hoisted(() => ({
  setPreference: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/features/payment-requests/domain", () => ({
  setPaymentRequestInvoicePreference: setPreference,
  savePaymentRequestFiscalData: vi.fn(),
  PaymentRequestNotFoundError: class PaymentRequestNotFoundError extends Error {},
  PaymentRequestExpiredError: class PaymentRequestExpiredError extends Error {},
  PaymentRequestCancelledError: class PaymentRequestCancelledError extends Error {},
}));

import { setPaymentRequestInvoicePreference } from "./actions";

describe("setPaymentRequestInvoicePreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the preference before revalidating the tokenized route", async () => {
    const callOrder: string[] = [];
    setPreference.mockImplementation(async () => {
      callOrder.push("persist");
    });
    revalidatePath.mockImplementation(() => {
      callOrder.push("revalidate");
    });

    await expect(setPaymentRequestInvoicePreference("token-123", true)).resolves.toEqual({ success: true });

    expect(setPreference).toHaveBeenCalledWith("token-123", { requiresInvoice: true });
    expect(revalidatePath).toHaveBeenCalledWith("/datos-de-pago/token-123");
    expect(callOrder).toEqual(["persist", "revalidate"]);
  });
});
