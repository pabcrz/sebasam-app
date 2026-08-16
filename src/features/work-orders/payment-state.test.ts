import { describe, expect, it } from "vitest";
import { derivePaymentState } from "./payment-state";

describe("derivePaymentState", () => {
  const completedAt = new Date("2026-08-01T18:00:00Z");

  it("derives paid, partial, and unpaid states with the exact remaining balance", () => {
    expect(derivePaymentState({ completedAt, paidCents: 12_500, remainingCents: 0 })).toMatchObject({
      label: "Pagada",
      balanceCents: null,
    });
    expect(derivePaymentState({ completedAt, paidCents: 5_000, remainingCents: 7_500 }, new Date("2026-08-10T18:00:00Z"))).toMatchObject({
      label: "Pago parcial",
      balanceCents: 7_500,
    });
    expect(derivePaymentState({ completedAt, paidCents: 0, remainingCents: 12_500 }, new Date("2026-08-10T18:00:00Z"))).toMatchObject({
      label: "Sin pago",
      balanceCents: 12_500,
    });
  });

  it("marks a balance urgent on day 16 in Mexico City, including partial payments", () => {
    const input = { completedAt, paidCents: 5_000, remainingCents: 7_500 };

    expect(derivePaymentState(input, new Date("2026-08-16T18:00:00Z"))).toMatchObject({ label: "Pago parcial", balanceCents: 7_500 });
    expect(derivePaymentState(input, new Date("2026-08-17T18:00:00Z"))).toMatchObject({ label: "Cobro urgente", balanceCents: 7_500 });
  });
});
