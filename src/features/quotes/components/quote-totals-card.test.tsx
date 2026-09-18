import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteTotalsCard } from "./quote-totals-card";

describe("QuoteTotalsCard", () => {
  it("renders subtotal, tax, and total formatted as currency", () => {
    const { container } = render(
      <QuoteTotalsCard
        subtotalCents={1006000}
        taxCents={160960}
        totalCents={1166960}
      />,
    );

    expect(screen.getByTestId("quote-subtotal")).toHaveTextContent("$10,060.00");
    expect(screen.getByTestId("quote-tax")).toHaveTextContent("$1,609.60");
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$11,669.60");
    expect(container.firstElementChild).toHaveClass("print:border-0", "print:bg-white", "print:p-2");
    expect(screen.getByTestId("quote-total").parentElement).toHaveClass("print:text-base");
  });

  it("renders the total amount in words in both screen and print spans", () => {
    render(
      <QuoteTotalsCard
        subtotalCents={1006000}
        taxCents={160960}
        totalCents={1166960}
      />,
    );

    const wordsContainer = screen.getByTestId("quote-total-in-words");
    expect(wordsContainer).toHaveTextContent(/ONCE MIL SEISCIENTOS SESENTA Y NUEVE PESOS 60\/100 M\.N\./);
  });

  it("does not render bank accounts or CLABE information in the totals card DOM", () => {
    const { container } = render(
      <QuoteTotalsCard
        subtotalCents={1006000}
        taxCents={160960}
        totalCents={1166960}
      />,
    );

    expect(container.textContent).not.toMatch(/CLABE/i);
    expect(container.textContent).not.toMatch(/Santander/i);
    expect(container.textContent).not.toMatch(/Mercado\s*Pago/i);
  });
});
