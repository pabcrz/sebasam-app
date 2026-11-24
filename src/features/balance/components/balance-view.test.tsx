import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BalanceView } from "./balance-view";
import type { BalanceSnapshot } from "../types";

const period = (period: "week" | "month" | "year", totalCents: number, paymentsCount: number) => ({
  period,
  rangeLabel: `rango ${period}`,
  totalCents,
  paymentsCount,
});

const snapshot: BalanceSnapshot = {
  generatedAt: new Date("2026-08-19T14:00:00.000Z"),
  collected: { week: period("week", 30_000, 1), month: period("month", 90_000, 5), year: period("year", 400_000, 9) },
  receivables: {
    totalCents: 80_000,
    overdueCents: 60_000,
    customers: [
      { customerId: "c-1", customerName: "Transportes Norte", pendingBalanceCents: 60_000, overdueBalanceCents: 60_000, oldestUnpaidDate: new Date("2026-08-05"), isOverdue: true },
      { customerId: "c-2", customerName: "Fletes Sur", pendingBalanceCents: 20_000, overdueBalanceCents: 0, oldestUnpaidDate: new Date("2026-09-30"), isOverdue: false },
    ],
  },
};

describe("BalanceView", () => {
  it("shows collected and receivable in two separate sections with their own figures", () => {
    render(<BalanceView snapshot={snapshot} />);

    const collected = within(screen.getByTestId("balance-collected"));
    expect(collected.getByText("$300.00")).toBeInTheDocument();
    expect(collected.getByText("$900.00")).toBeInTheDocument();
    expect(collected.getByText("$4,000.00")).toBeInTheDocument();
    expect(collected.getByText(/1 pago registrado · rango week/)).toBeInTheDocument();
    expect(collected.queryByText("$800.00")).not.toBeInTheDocument();

    const receivables = within(screen.getByTestId("balance-receivables"));
    expect(receivables.getByText("$800.00")).toBeInTheDocument();
    expect(receivables.getByText("$600.00", { selector: "p" })).toBeInTheDocument();
    expect(receivables.getByText(/No es dinero cobrado/)).toBeInTheDocument();
    expect(receivables.queryByText("$4,000.00")).not.toBeInTheDocument();
  });

  it("lists every customer with a balance and links each one to its account statement", () => {
    render(<BalanceView snapshot={snapshot} />);

    expect(screen.getByRole("link", { name: /transportes norte/i })).toHaveAttribute("href", "/admin/customers/c-1/estado-de-cuenta");
    expect(screen.getByRole("link", { name: /fletes sur/i })).toHaveAttribute("href", "/admin/customers/c-2/estado-de-cuenta");
    expect(screen.getByText("Saldo vencido")).toBeInTheDocument();
  });

  it("lists more than five customers instead of hiding them", () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      customerId: `c-${index}`, customerName: `Cliente ${index}`, pendingBalanceCents: 1_000, overdueBalanceCents: 0, oldestUnpaidDate: null, isOverdue: false,
    }));
    render(<BalanceView snapshot={{ ...snapshot, receivables: { totalCents: 8_000, overdueCents: 0, customers: many } }} />);

    expect(screen.getAllByRole("link", { name: /^cliente \d/i })).toHaveLength(8);
    expect(screen.queryByRole("link", { name: /más en clientes/i })).not.toBeInTheDocument();
  });

  it("shows empty states when nothing was collected or is owed", () => {
    render(
      <BalanceView
        snapshot={{
          ...snapshot,
          collected: { week: period("week", 0, 0), month: period("month", 0, 0), year: period("year", 0, 0) },
          receivables: { totalCents: 0, overdueCents: 0, customers: [] },
        }}
      />,
    );

    expect(screen.getAllByText(/Sin pagos registrados/)).toHaveLength(3);
    expect(screen.getByText("Sin saldos pendientes")).toBeInTheDocument();
    expect(screen.getByText("No hay saldos pendientes por cobrar")).toBeInTheDocument();
  });
});
