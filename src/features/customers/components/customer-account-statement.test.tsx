import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerAccountStatement } from "./customer-account-statement";

const statement = {
  totalContractedCents: 25000,
  totalPaidCents: 17500,
  pendingBalanceCents: 7500,
  movements: [
    {
      id: "ledger-1",
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
      type: "CREDIT",
      amountCents: 5000,
      resultingBalanceCents: 20000,
      payment: { method: "CASH", quote: { id: "quote-1", number: "COT-001" } },
    },
  ],
};

describe("CustomerAccountStatement", () => {
  it("shows the accumulated totals and complete movement information", () => {
    render(<CustomerAccountStatement statement={statement} />);

    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Total contratado$250.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Total pagado$175.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Saldo pendiente$75.00Pendiente");
    expect(screen.getByText("Cotización COT-001")).toBeInTheDocument();
    expect(screen.getByText("Crédito")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Saldo resultante").parentElement).toHaveTextContent("$200.00");
  });

  it("distinguishes a settled account", () => {
    render(<CustomerAccountStatement statement={{ ...statement, pendingBalanceCents: 0, totalPaidCents: 25000 }} />);

    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Cuenta liquidada");
  });

  it("explains when the account has no financial movements", () => {
    render(<CustomerAccountStatement statement={{
      totalContractedCents: 0,
      totalPaidCents: 0,
      pendingBalanceCents: 0,
      movements: [],
    }} />);

    expect(screen.getByText("Este cliente todavía no tiene movimientos financieros registrados.")).toBeInTheDocument();
  });
});
