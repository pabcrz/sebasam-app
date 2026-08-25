import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LedgerEntryType, LedgerMovementType, PaymentMethod } from "@prisma/client";
import { CustomerAccountStatement } from "./customer-account-statement";
import type { CustomerAccountStatement as CustomerAccountStatementType } from "../queries";

const statement: CustomerAccountStatementType = {
  totalContractedCents: 25000,
  totalPaidCents: 17500,
  pendingBalanceCents: 7500,
  availableCreditCents: 2500,
  movements: [
    {
      id: "ledger-1",
      createdAt: new Date("2026-08-01T10:00:00.000Z"),
      type: LedgerEntryType.CREDIT,
      movementType: LedgerMovementType.PAYMENT_CAPTURE,
      amountCents: 5000,
      resultingBalanceCents: 20000,
      actor: null,
      reason: null,
      payment: {
        id: "p-1",
        method: PaymentMethod.CASH,
        amountCents: 5000,
        operationKey: "op-1",
        reversedAt: null,
        quote: { id: "quote-1", number: "COT-001" },
      },
      paymentApplication: null,
      workOrder: null,
    },
  ],
};

describe("CustomerAccountStatement", () => {
  it("shows the accumulated totals and complete movement information", () => {
    render(<CustomerAccountStatement statement={statement} />);

    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Total contratado$250.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Total pagado$175.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Saldo a favor$25.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Saldo pendiente$75.00Pendiente");
    expect(screen.getByText("Cotización COT-001")).toBeInTheDocument();
    expect(screen.getByText("Recepción de pago")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Saldo resultante").parentElement).toHaveTextContent("$200.00");
  });

  it("distinguishes a settled account", () => {
    render(
      <CustomerAccountStatement
        statement={{
          ...statement,
          pendingBalanceCents: 0,
          totalPaidCents: 25000,
          availableCreditCents: 0,
        }}
      />,
    );

    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Cuenta liquidada");
  });

  it("explains when the account has no financial movements", () => {
    render(
      <CustomerAccountStatement
        statement={{
          totalContractedCents: 0,
          totalPaidCents: 0,
          pendingBalanceCents: 0,
          availableCreditCents: 0,
          movements: [],
        }}
      />,
    );

    expect(screen.getByText("Este cliente todavía no tiene movimientos financieros registrados.")).toBeInTheDocument();
  });
});
