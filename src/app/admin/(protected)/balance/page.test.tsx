import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildProfitSummary } from "@/features/balance/profit";

const role = vi.hoisted(() => ({ current: "SUPER_ADMIN" }));
const period = {
  month: "2026-11", label: "Noviembre de 2026", prevMonth: "2026-10", nextMonth: "2026-12", isCurrent: true,
  start: new Date(), end: new Date(), dateStart: new Date(), dateEnd: new Date(),
};

const getBalanceSnapshotMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    generatedAt: new Date("2026-08-19T14:00:00.000Z"),
    collected: {
      week: { period: "week", rangeLabel: "semana", totalCents: 0, paymentsCount: 0 },
      month: { period: "month", rangeLabel: "mes", totalCents: 0, paymentsCount: 0 },
      year: { period: "year", rangeLabel: "año", totalCents: 0, paymentsCount: 0 },
    },
    receivables: { totalCents: 0, overdueCents: 0, customers: [] },
  }),
);
const getProfitSnapshotMock = vi.hoisted(() => vi.fn());
const listExpensesMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/balance/queries", () => ({ getBalanceSnapshot: getBalanceSnapshotMock }));
vi.mock("@/features/balance/profit-queries", () => ({ getProfitSnapshot: getProfitSnapshotMock }));
vi.mock("@/features/balance/expenses/queries", () => ({
  listExpensesForMonth: listExpensesMock,
  listSuppliers: vi.fn(async () => []),
  listRecurringForMonth: vi.fn(async () => ({ templates: [], pending: [] })),
  listExpensesForAssignment: vi.fn(async () => ({ expenses: (await listExpensesMock()).expenses.map((expense: object) => ({ ...expense, links: [] })), notes: [] })),
}));
vi.mock("@/features/balance/expenses/actions", () => ({ createExpenseFromForm: vi.fn(), updateExpenseFromForm: vi.fn(), deleteExpenseFromForm: vi.fn(), assignExpenseShareFromForm: vi.fn(), linkExpenseToNoteFromForm: vi.fn(), unlinkExpenseFromNoteFromForm: vi.fn(), confirmRecurringExpenseFromForm: vi.fn(), skipRecurringExpenseFromForm: vi.fn(), stopRecurringExpenseFromForm: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireProfileForPage: vi.fn(async () => ({ profile: { role: role.current } })),
  canRegisterExpenses: (value: string) => ["ADMIN", "ADMIN_ASSISTANT", "SUPER_ADMIN"].includes(value),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

import BalancePage from "./page";

const params = (query: Record<string, string> = {}) => ({ searchParams: Promise.resolve(query) });

describe("BalancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role.current = "SUPER_ADMIN";
    getProfitSnapshotMock.mockResolvedValue({ period, jobs: [], summary: buildProfitSummary({ income: { laborCents: 0, partsCents: 0, otherCents: 0 }, cashCollectedCents: 0, payrollCents: 0, expenses: [] }) });
    listExpensesMock.mockResolvedValue({ period, expenses: [] });
  });

  it("shows cobrado and por cobrar by default, with the three sections for the owner", async () => {
    render(await BalancePage(params()));

    expect(screen.getByRole("heading", { level: 1, name: "Balance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cobrado" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Por cobrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Utilidad" })).toHaveAttribute("href", "/admin/balance?tab=utilidad");
    expect(screen.getByRole("link", { name: "Gastos" })).toHaveAttribute("href", "/admin/balance?tab=gastos");
    expect(getProfitSnapshotMock).not.toHaveBeenCalled();
  });

  it("shows the profit view of the requested month and view", async () => {
    render(await BalancePage(params({ tab: "utilidad", month: "2026-10", view: "refacciones" })));

    expect(getProfitSnapshotMock).toHaveBeenCalledWith("2026-10");
    expect(screen.getByTestId("profit-parts")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mes anterior" })).toHaveAttribute("href", expect.stringContaining("tab=utilidad"));
  });

  it("shows the expenses of the requested month with the result notice", async () => {
    render(await BalancePage(params({ tab: "gastos", month: "2026-10", created: "1" })));

    expect(listExpensesMock).toHaveBeenCalledWith("2026-10");
    expect(screen.getByTestId("expenses-view")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Gasto registrado.");
  });

  it("falls back to cobros for an unknown tab or view", async () => {
    render(await BalancePage(params({ tab: "secretos" })));
    expect(screen.getByRole("heading", { name: "Cobrado" })).toBeInTheDocument();

    render(await BalancePage(params({ tab: "utilidad", view: "inventado" })));
    expect(screen.getByTestId("profit-general")).toBeInTheDocument();
  });

  it("lets the owner assign how each expense is split between the two accounts", async () => {
    listExpensesMock.mockResolvedValue({
      period,
      expenses: [{ id: "e1", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 100_000, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: null, paymentMethod: null, notes: null }],
    });

    render(await BalancePage(params({ tab: "utilidad", view: "asignar", month: "2026-11" })));

    expect(screen.getByTestId("allocation-view")).toBeInTheDocument();
    expect(screen.getByTestId("allocation-split")).toHaveTextContent("Refacciones $500.00 · Mano de obra $500.00");
    expect(screen.getByRole("link", { name: "Asignar" })).toBeInTheDocument();
  });

  it("gives the ADMIN who registers expenses cobros and gastos, but never profit or the split", async () => {
    role.current = "ADMIN";
    listExpensesMock.mockResolvedValue({
      period,
      expenses: [{ id: "e1", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 100_000, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: null, paymentMethod: null, notes: null }],
    });

    render(await BalancePage(params({ tab: "gastos" })));

    expect(screen.getByRole("link", { name: "Cobros y saldos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gastos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Utilidad" })).not.toBeInTheDocument();
    expect(screen.getByTestId("expenses-view")).toBeInTheDocument();
    expect(screen.getByTestId("expense-row")).not.toHaveTextContent("refacciones");
    expect(screen.queryByTestId("allocation-view")).not.toBeInTheDocument();
  });

  it("sends an ADMIN who asks for the profit or the assignment to cobros, without querying them", async () => {
    role.current = "ADMIN";

    render(await BalancePage(params({ tab: "utilidad", view: "asignar" })));

    expect(screen.getByRole("heading", { name: "Cobrado" })).toBeInTheDocument();
    expect(screen.queryByTestId("profit-view")).not.toBeInTheDocument();
    expect(getProfitSnapshotMock).not.toHaveBeenCalled();
  });

  it("lets the assistant register expenses but never see profit or the split", async () => {
    role.current = "ADMIN_ASSISTANT";

    render(await BalancePage(params({ tab: "utilidad" })));

    expect(screen.getByRole("link", { name: "Gastos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Utilidad" })).not.toBeInTheDocument();
    expect(getProfitSnapshotMock).not.toHaveBeenCalled();
  });

  it("gives other operational roles only cobrado and por cobrar, whatever the address says", async () => {
    role.current = "WORKER";

    render(await BalancePage(params({ tab: "gastos" })));

    expect(screen.getByRole("heading", { level: 1, name: "Balance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cobrado" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gastos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Utilidad" })).not.toBeInTheDocument();
    expect(listExpensesMock).not.toHaveBeenCalled();
    expect(getProfitSnapshotMock).not.toHaveBeenCalled();
  });
});
