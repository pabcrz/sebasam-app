import { describe, expect, it } from "vitest";
import { derivePaymentState } from "./payment-state";

describe("derivePaymentState", () => {
  const completedAt = new Date("2026-08-01T18:00:00Z");
  const paymentDueDate = new Date("2026-08-08T18:00:00Z");

  it("derives paid state when remaining balance is 0 or less", () => {
    expect(
      derivePaymentState({ completedAt, paymentDueDate, paidCents: 12_500, remainingCents: 0 }),
    ).toMatchObject({
      label: "Pagada",
      balanceCents: null,
      variant: "success",
    });
  });

  it("derives Sin fecha de vencimiento when paymentDueDate is null and has pending balance", () => {
    expect(
      derivePaymentState({ completedAt, paymentDueDate: null, paidCents: 0, remainingCents: 10_000 }),
    ).toMatchObject({
      label: "Sin fecha de vencimiento",
      balanceCents: 10_000,
      variant: "default",
    });
  });

  it("derives Sin pago when no payments have been made and it is not overdue", () => {
    const futureDueDate = new Date("2026-08-15T18:00:00Z");
    expect(
      derivePaymentState(
        { completedAt, paymentDueDate: futureDueDate, paidCents: 0, remainingCents: 12_500 },
        new Date("2026-08-10T18:00:00Z"),
      ),
    ).toMatchObject({
      label: "Sin pago",
      balanceCents: 12_500,
      variant: "warning",
    });
  });

  it("derives Pago parcial when partial payment has been applied and it is not overdue", () => {
    const futureDueDate = new Date("2026-08-15T18:00:00Z");
    expect(
      derivePaymentState(
        { completedAt, paymentDueDate: futureDueDate, paidCents: 5_000, remainingCents: 7_500 },
        new Date("2026-08-10T18:00:00Z"),
      ),
    ).toMatchObject({
      label: "Pago parcial",
      balanceCents: 7_500,
      variant: "warning",
    });
  });

  it("derives Vencida when due date has passed in CDMX and balance > 0", () => {
    expect(
      derivePaymentState(
        { completedAt, paymentDueDate, paidCents: 5_000, remainingCents: 7_500 },
        new Date("2026-08-09T18:00:00Z"), // day after due date
      ),
    ).toMatchObject({
      label: "Vencida",
      balanceCents: 7_500,
      variant: "danger",
    });
  });

  it("derives Plazo pactado and does not mark Vencida during negotiated term", () => {
    const pastDueDate = new Date("2026-08-08T18:00:00Z");
    const agreedDueDate = new Date("2026-08-25T18:00:00Z");

    expect(
      derivePaymentState(
        {
          completedAt,
          paymentDueDate: pastDueDate,
          paidCents: 0,
          remainingCents: 10_000,
          exception: {
            type: "NEGOTIATED_TERM",
            agreedDueDate,
          },
        },
        new Date("2026-08-10T18:00:00Z"),
      ),
    ).toMatchObject({
      label: "Plazo pactado",
      balanceCents: 10_000,
      variant: "info",
    });
  });

  it("derives Pend. autorización and never marks Vencida while pending", () => {
    const pastDueDate = new Date("2026-08-08T18:00:00Z");

    expect(
      derivePaymentState(
        {
          completedAt,
          paymentDueDate: pastDueDate,
          paidCents: 0,
          remainingCents: 10_000,
          exception: {
            type: "PENDING_AUTHORIZATION",
          },
        },
        new Date("2026-08-15T18:00:00Z"),
      ),
    ).toMatchObject({
      label: "Pend. autorización",
      balanceCents: 10_000,
      variant: "info",
    });
  });
});
