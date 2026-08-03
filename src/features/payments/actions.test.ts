import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { recordCashPayment } from "./domain";
import { recordCashPaymentAction } from "./actions";

vi.mock("@/lib/auth/session", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./domain", async () => ({
  ...(await vi.importActual<typeof import("./domain")>("./domain")),
  recordCashPayment: vi.fn(),
}));

describe("recordCashPaymentAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an administrator, records exact cents, and refreshes quotes", async () => {
    (recordCashPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "payment-1" });

    await recordCashPaymentAction("quote-1", "123.45", "payment-operation-1");

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(recordCashPayment).toHaveBeenCalledWith({
      quoteId: "quote-1",
      amountCents: 12345,
      operationKey: "payment-operation-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
  });

  it("does not call the domain for invalid form amounts", async () => {
    await expect(recordCashPaymentAction("quote-1", "1.999", "payment-operation-1")).rejects.toThrow(
      "Ingresa un monto válido con hasta dos decimales.",
    );

    expect(recordCashPayment).not.toHaveBeenCalled();
  });
});
