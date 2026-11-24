import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExpenseLink, ExpenseRow } from "../expenses/queries";
import { ExpenseAllocationView } from "./expense-allocation-view";

const expenses: Array<ExpenseRow & { links: ExpenseLink[] }> = [
  { id: "e1", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 100_000, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: "Gasolinera", paymentMethod: null, notes: null, links: [{ payableNoteId: "n1", referenceNumber: "N-0001", amountCents: 30_000 }] },
  { id: "e2", spentAt: new Date("2026-11-12T00:00:00Z"), amountCents: 500_000, category: "RENT", invoiceStatus: "NOT_INVOICED", partsSharePercent: 0, supplier: null, paymentMethod: null, notes: null, links: [] },
];

const props = { notes: [{ id: "n1", label: "N-0001 · Cliente · Muelles" }], assign: vi.fn(), link: vi.fn(), unlink: vi.fn() };

describe("ExpenseAllocationView", () => {
  it("shows each expense with how it is split today and an input with its current percentage", () => {
    render(<ExpenseAllocationView expenses={expenses} month="2026-11" {...props} />);

    const rows = screen.getAllByTestId("allocation-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText(/Combustible y traslados/)).toBeInTheDocument();
    expect(within(rows[0]).getByTestId("allocation-split")).toHaveTextContent("Refacciones $500.00 · Mano de obra $500.00");
    expect(within(rows[0]).getByLabelText("% a refacciones")).toHaveValue(50);
    expect(within(rows[1]).getByTestId("allocation-split")).toHaveTextContent("Refacciones $0.00 · Mano de obra $5,000.00");
    expect(within(rows[1]).getByLabelText("% a refacciones")).toHaveValue(0);
  });

  it("keeps the month in each form so saving returns to it, and bounds the percentage", () => {
    render(<ExpenseAllocationView expenses={expenses} month="2026-11" {...props} />);

    const row = screen.getAllByTestId("allocation-row")[0];
    expect(row.querySelector('input[name="month"]')).toHaveValue("2026-11");
    const input = within(row).getByLabelText("% a refacciones");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
    expect(within(row).getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("shows the notes a purchase is charged to, with a way to remove each and to link another", () => {
    render(<ExpenseAllocationView expenses={expenses} month="2026-11" {...props} />);

    const [fuel, rent] = screen.getAllByTestId("allocation-row");
    expect(within(fuel).getByTestId("allocation-links")).toHaveTextContent("Nota N-0001 · $300.00");
    expect(within(fuel).getByRole("button", { name: "Quitar" })).toBeInTheDocument();
    expect(within(rent).queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
    expect(within(rent).getByLabelText("Ligar a una nota")).toBeInTheDocument();
    expect(within(rent).getByRole("option", { name: "N-0001 · Cliente · Muelles" })).toBeInTheDocument();
    expect(within(rent).getByRole("button", { name: "Ligar" })).toBeInTheDocument();
  });

  it("says so when there are no expenses", () => {
    render(<ExpenseAllocationView expenses={[]} month="2026-11" {...props} />);
    expect(screen.getByText("No hay gastos registrados este mes.")).toBeInTheDocument();
  });
});
