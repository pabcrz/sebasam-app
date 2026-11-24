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

const actions = { create: vi.fn(), update: vi.fn(), remove: vi.fn(), confirmRecurring: vi.fn(), skipRecurring: vi.fn(), stopRecurring: vi.fn() };
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
    expect(rows[1]).not.toHaveTextContent("refacciones");
  });

  it("shows the split of each expense only to the owner", () => {
    render(<ExpensesView period={period} expenses={expenses} today="2026-11-23" hrefFor={hrefFor} actions={actions} showAllocation />);

    expect(screen.getAllByTestId("expense-row")[1]).toHaveTextContent("50 % a refacciones");
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

  it("proposes the pending recurring expenses of the month with a confirm/skip form and lists the templates", () => {
    const rent = { id: "r1", category: "RENT", amountCents: 500_000, invoiceStatus: "NOT_INVOICED" as const, supplier: "Casero", dayOfMonth: 5 };
    const light = { id: "r2", category: "ELECTRICITY", amountCents: 80_000, invoiceStatus: "INVOICED" as const, supplier: null, dayOfMonth: 10 };
    render(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} recurring={{ templates: [rent, light], pending: [light] }} />);

    const pending = screen.getAllByTestId("recurring-pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]).toHaveTextContent("Luz");
    expect(within(pending[0]).getByLabelText("Monto de Luz")).toHaveValue(800);
    expect(within(pending[0]).getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(within(pending[0]).getByRole("button", { name: "Omitir este mes" })).toBeInTheDocument();
    expect(pending[0].querySelector('input[name="month"]')).toHaveValue("2026-11");
    expect(screen.getAllByTestId("recurring-template")).toHaveLength(2);
  });

  it("shows nothing about recurring expenses when there are no templates", () => {
    render(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);
    expect(screen.queryByTestId("recurring-section")).not.toBeInTheDocument();
  });

  it("offers the month's CSV only when there is something to export", () => {
    const { rerender } = render(<ExpensesView period={period} expenses={expenses} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);
    expect(screen.getByRole("link", { name: "Descargar CSV" })).toHaveAttribute("href", "/admin/balance/gastos.csv?month=2026-11");

    rerender(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);
    expect(screen.queryByRole("link", { name: "Descargar CSV" })).not.toBeInTheDocument();
  });

  it("links an expense's receipt only for who may open it", () => {
    const withReceipt = [{ ...expenses[0], hasReceipt: true }, expenses[1]];
    const { rerender } = render(<ExpensesView period={period} expenses={withReceipt} today="2026-11-23" hrefFor={hrefFor} actions={actions} canViewReceipts />);
    const links = screen.getAllByRole("link", { name: "Ver comprobante" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/admin/balance/comprobante/e1");

    rerender(<ExpensesView period={period} expenses={withReceipt} today="2026-11-23" hrefFor={hrefFor} actions={actions} />);
    expect(screen.queryByRole("link", { name: "Ver comprobante" })).not.toBeInTheDocument();
  });

  it("shows the result notices with the right role", () => {
    const { rerender } = render(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} notice={{ tone: "success", text: "Gasto registrado." }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Gasto registrado.");

    rerender(<ExpensesView period={period} expenses={[]} today="2026-11-23" hrefFor={hrefFor} actions={actions} notice={{ tone: "danger", text: "Revisa los datos del gasto e intenta de nuevo." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Revisa los datos");
  });
});
