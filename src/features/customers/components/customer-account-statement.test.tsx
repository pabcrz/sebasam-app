import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LedgerEntryType, LedgerMovementType, PaymentMethod } from "@prisma/client";
import { CustomerAccountStatement } from "./customer-account-statement";
import type { CustomerAccountStatement as CustomerAccountStatementType } from "../queries";

const statement: CustomerAccountStatementType = {
  nominalContractedCents: 25000,
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
  it("shows the accumulated totals and complete movement information with reversal option", () => {
    const reversePaymentAction = vi.fn().mockResolvedValue({});
    render(<CustomerAccountStatement statement={statement} reversePaymentAction={reversePaymentAction} />);

    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Importe nominal$250.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Importe liquidable$250.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Cobrado$175.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Saldo a favor$25.00");
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Saldo pendiente$75.00Pendiente");
    expect(screen.getByText("Cotización COT-001")).toBeInTheDocument();
    expect(screen.getByText("Recepción de pago")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Saldo resultante").parentElement).toHaveTextContent("$200.00");
    expect(screen.getByRole("button", { name: /revertir pago de \$50\.00/i })).toBeInTheDocument();
  });

  it("displays reversed badge and hides reversal button when payment is reversed", () => {
    const reversedStatement: CustomerAccountStatementType = {
      ...statement,
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
            reversedAt: new Date("2026-08-02T10:00:00.000Z"),
            quote: { id: "quote-1", number: "COT-001" },
          },
          paymentApplication: null,
          workOrder: null,
        },
      ],
    };

    render(<CustomerAccountStatement statement={reversedStatement} />);

    expect(screen.getByText("Revertido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revertir pago/i })).not.toBeInTheDocument();
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
          nominalContractedCents: 0,
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

  it("shows a correction trigger for an active payment capture when an admin action is provided", () => {
    const correctPaymentAction = vi.fn().mockResolvedValue({});
    render(<CustomerAccountStatement statement={statement} correctPaymentAction={correctPaymentAction} />);

    expect(screen.getByRole("button", { name: /corregir pago de \$50\.00/i })).toBeInTheDocument();
  });
});
