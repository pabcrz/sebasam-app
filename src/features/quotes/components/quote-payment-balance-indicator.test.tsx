import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotePaymentBalanceIndicator } from "./quote-payment-balance-indicator";

describe("QuotePaymentBalanceIndicator", () => {
  it("does not show a financial state before the first payment", () => {
    render(<QuotePaymentBalanceIndicator paidCents={0} remainingCents={10000} />);

    expect(screen.queryByTestId("quote-payment-balance-indicator")).not.toBeInTheDocument();
  });

  it("shows the pending balance after a partial payment", () => {
    render(<QuotePaymentBalanceIndicator paidCents={2500} remainingCents={7500} />);

    expect(screen.getByTestId("quote-payment-balance-indicator")).toHaveTextContent("Saldo pendiente: $75.00");
  });

  it("shows settlement without changing the operational status", () => {
    render(<QuotePaymentBalanceIndicator paidCents={10000} remainingCents={0} />);

    expect(screen.getByTestId("quote-payment-balance-indicator")).toHaveTextContent("Liquidada");
  });
});
