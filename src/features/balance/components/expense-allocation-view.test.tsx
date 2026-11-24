import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExpenseRow } from "../expenses/queries";
import { ExpenseAllocationView } from "./expense-allocation-view";

const expenses: ExpenseRow[] = [
  { id: "e1", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 100_000, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: "Gasolinera", paymentMethod: null, notes: null },
  { id: "e2", spentAt: new Date("2026-11-12T00:00:00Z"), amountCents: 500_000, category: "RENT", invoiceStatus: "NOT_INVOICED", partsSharePercent: 0, supplier: null, paymentMethod: null, notes: null },
];

describe("ExpenseAllocationView", () => {
  it("shows each expense with how it is split today and an input with its current percentage", () => {
    render(<ExpenseAllocationView expenses={expenses} month="2026-11" assign={vi.fn()} />);

    const rows = screen.getAllByTestId("allocation-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/Combustible y traslados/)).toBeInTheDocument();
    expect(within(rows[0]).getByTestId("allocation-split")).toHaveTextContent("Refacciones $500.00 · Mano de obra $500.00");
    expect(within(rows[0]).getByLabelText("% a refacciones")).toHaveValue(50);
    expect(within(rows[1]).getByTestId("allocation-split")).toHaveTextContent("Refacciones $0.00 · Mano de obra $5,000.00");
    expect(within(rows[1]).getByLabelText("% a refacciones")).toHaveValue(0);
  });

  it("keeps the month in each form so saving returns to it, and bounds the percentage", () => {
    render(<ExpenseAllocationView expenses={expenses} month="2026-11" assign={vi.fn()} />);

    const row = screen.getAllByTestId("allocation-row")[0];
    expect(row.querySelector('input[name="month"]')).toHaveValue("2026-11");
    const input = within(row).getByLabelText("% a refacciones");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
    expect(within(row).getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("says so when there are no expenses", () => {
    render(<ExpenseAllocationView expenses={[]} month="2026-11" assign={vi.fn()} />);
    expect(screen.getByText("No hay gastos registrados este mes.")).toBeInTheDocument();
  });
});
