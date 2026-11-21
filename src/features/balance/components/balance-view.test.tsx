import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BalanceView } from "./balance-view";
import type { IncomeBalance } from "../queries";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

const balance: IncomeBalance = {
  collected: { totalCents: 900000, paymentsCount: 3 },
  receivables: {
    totalCents: 452000,
    customers: [
      { customerId: "c-1", customerName: "Transportes del Bajío", pendingBalanceCents: 452000, oldestUnpaidDate: null, isOverdue: true },
    ],
  },
  periods: [],
};

function renderView(value: IncomeBalance = balance) {
  return render(
    <BalanceView balance={value} period="month" anchor="2026-11-21" rangeLabel="noviembre de 2026" today={new Date("2026-11-21T18:00:00Z")} />,
  );
}

describe("BalanceView", () => {
  it("shows collected income and the receivable balance as separate figures", () => {
    renderView();

    const collected = screen.getByRole("region", { name: "Ingresos cobrados" });
    expect(collected).toHaveTextContent("Cobrado · noviembre de 2026");
    expect(collected).toHaveTextContent("$9,000.00");
    expect(collected).toHaveTextContent("3 pagos");
    expect(collected).not.toHaveTextContent("$4,520.00");

    const receivables = screen.getByRole("region", { name: "Por cobrar" });
    expect(receivables).toHaveTextContent("Saldo por cobrar a hoy");
    expect(receivables).not.toHaveTextContent("$9,000.00");
  });

  it("links each customer with a balance to their account statement", () => {
    renderView();

    expect(screen.getByRole("link", { name: /Transportes del Bajío/ })).toHaveAttribute(
      "href",
      "/admin/customers/c-1/estado-de-cuenta",
    );
  });

  it("shows empty states when nothing was collected and nothing is owed", () => {
    renderView({ collected: { totalCents: 0, paymentsCount: 0 }, receivables: { totalCents: 0, customers: [] }, periods: [] });

    expect(screen.getByText("Sin pagos registrados en este período")).toBeInTheDocument();
    expect(screen.getByText("No hay saldos pendientes por cobrar")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Por cobrar" })).getByText("$0.00")).toBeInTheDocument();
  });

  it("moves the collected period through the URL", async () => {
    renderView();

    await userEvent.setup().click(screen.getByRole("button", { name: "Periodo anterior" }));

    expect(replaceMock).toHaveBeenCalledWith("/admin/balance?period=month&anchor=2026-10-01", { scroll: false });
  });
});
