import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExpenseRow } from "../expenses/queries";
import { ExpensesView } from "./expenses-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

const period = {
  month: "2026-11", label: "Noviembre de 2026", prevMonth: "2026-10", nextMonth: "2026-12", isCurrent: true,
  start: new Date(), end: new Date(), dateStart: new Date(), dateEnd: new Date(),
};

const expenses: ExpenseRow[] = [
  { id: "e1", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 500_000, category: "RENT", invoiceStatus: "NOT_INVOICED", partsSharePercent: 0, supplier: "Casero", paymentMethod: "TRANSFER", notes: null },
  { id: "e2", spentAt: new Date("2026-11-18T00:00:00Z"), amountCents: 100_000, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: null, paymentMethod: "CASH", notes: "Ruta a refaccionaria" },
];

const actions = { create: vi.fn(), update: vi.fn(), remove: vi.fn() };
const hrefFor = (month: string | null) => `/admin/balance?tab=gastos&month=${month ?? "actual"}`;

describe("ExpensesView", () => {
  it("lists each expense with its category, invoice status, share and detail", () => {
    render(<ExpensesView period={period} expenses={expenses} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);

    const rows = screen.getAllByTestId("expense-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Renta");
    expect(rows[0]).toHaveTextContent("Sin factura");
    expect(rows[0]).toHaveTextContent("Casero");
    expect(rows[0]).toHaveTextContent("Transferencia");
    expect(rows[0]).toHaveTextContent("$5,000.00");
    expect(rows[1]).toHaveTextContent("Combustible y traslados");
    expect(rows[1]).toHaveTextContent("Con factura");
    expect(rows[1]).toHaveTextContent("50 % a refacciones");
  });

  it("totals the month and splits it into with and without invoice", () => {
    render(<ExpensesView period={period} expenses={expenses} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);

    const totals = within(screen.getByTestId("expenses-totals"));
    expect(totals.getByText("Total del mes").closest("div")).toHaveTextContent("$6,000.00");
    expect(totals.getByText("Con factura").closest("div")).toHaveTextContent("$1,000.00");
    expect(totals.getByText("Sin factura").closest("div")).toHaveTextContent("$5,000.00");
  });

  it("shows an empty state, the new-expense button and the month navigation", () => {
    render(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);

    expect(screen.getByText("No hay gastos registrados en Noviembre de 2026.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo gasto/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mes anterior" })).toHaveAttribute("href", "/admin/balance?tab=gastos&month=2026-10");
    expect(screen.queryByRole("link", { name: "Mes actual" })).not.toBeInTheDocument();
  });

  it("shows the result notices with the right role", () => {
    const { rerender } = render(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} notice={{ tone: "success", text: "Gasto registrado." }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Gasto registrado.");

    rerender(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} notice={{ tone: "danger", text: "Revisa los datos del gasto e intenta de nuevo." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Revisa los datos");
  });
});
