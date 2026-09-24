import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
const quoteBuilderDialogProps = vi.hoisted(() => vi.fn());
const listCompletedWorkOrders = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    workOrders: [],
    page: 1,
    hasNextPage: false,
    totals: { totalPendingCents: 250_000, totalOverdueCents: 50_000, totalPaidCents: 150_000 },
  }),
);
vi.mock("@/features/work-orders/queries", () => ({ listCompletedWorkOrders }));
vi.mock("@/features/customers/queries", () => ({ listCustomers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/workers/queries", () => ({ listActiveMasters: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: vi.fn().mockResolvedValue(null),
  isAdminRole: vi.fn().mockReturnValue(false),
  requireOperationalRole: vi.fn().mockResolvedValue({ id: "1", role: "ADMIN" }),
}));
vi.mock("@/features/work-orders/components/notas-filters", () => ({ NotasFilters: () => null }));
vi.mock("@/features/work-orders/components/work-order-completed-list", () => ({ WorkOrderCompletedList: () => null }));
vi.mock("@/features/payments/actions", () => ({
  recordPaymentAction: vi.fn(),
  correctPaymentAction: vi.fn(),
}));
vi.mock("@/features/work-orders/actions", () => ({
  rollbackWorkOrderAction: vi.fn(),
  createDirectOperationFromWorkspace: vi.fn(),
}));
vi.mock("@/features/quotes/components/quote-builder-dialog", () => ({
  QuoteBuilderDialog: (props: Record<string, unknown>) => {
    quoteBuilderDialogProps(props);
    return createElement("button", { type: "button" }, props.triggerLabel as string);
  },
}));
import { createDirectOperationFromWorkspace } from "@/features/work-orders/actions";
import NotasPage from "./page";
describe("NotasPage", () => {
  it("renders the workspace without a redundant page header card and with Nueva nota trigger", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Trabajos completados" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /nueva nota/i }).length).toBeGreaterThan(0);
  });

  it("renders financial totals cards for pending, overdue, and paid amounts", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Pendiente de cobro")).toBeInTheDocument();
    expect(screen.getByText("Saldo vencido")).toBeInTheDocument();
    expect(screen.getByText("Cobrado en periodo")).toBeInTheDocument();
    expect(screen.getByText("$2,500.00")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
  });

  it("renders actionable empty state with Limpiar filtros button when no work orders exist", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Limpiar filtros")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/admin/notas");
  });

  it("wires both direct-note dialogs to the discriminated operation action", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));

    const dialogProps = quoteBuilderDialogProps.mock.calls.map(([props]) => props);
    const noteDialogs = dialogProps.filter((props) => props.mode === "direct-note");
    expect(noteDialogs.length).toBeGreaterThanOrEqual(2);
    expect(noteDialogs.every((props) => props.createAction === createDirectOperationFromWorkspace)).toBe(true);
  });
});
