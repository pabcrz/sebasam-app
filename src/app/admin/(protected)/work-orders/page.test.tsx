import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/features/work-orders/queries", () => ({ listActiveWorkOrders: vi.fn().mockResolvedValue([]), listActiveWorkers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/queries", () => ({ listCustomers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/quotes/queries", () => ({ listQuotes: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/actions", () => ({
  searchCustomersForQuote: vi.fn(),
  createOrReuseCustomerForQuote: vi.fn(),
}));
vi.mock("@/features/quotes/actions", () => ({ duplicateQuoteFromForm: vi.fn(), updateDraftQuoteFromWorkspace: vi.fn() }));
vi.mock("@/features/work-orders/actions", () => ({
  assignWorkOrderAction: vi.fn(),
  completeWorkOrderAction: vi.fn(),
  rollbackWorkOrderAction: vi.fn(),
  createDirectWorkOrderFromWorkspace: vi.fn(),
}));
vi.mock("@/features/work-orders/components/work-order-active-list", () => ({ WorkOrderActiveList: () => null }));
import WorkOrdersPage from "./page";
describe("WorkOrdersPage", () => {
  it("renders the workspace without a redundant page header card and with direct work order action", async () => {
    render(await WorkOrdersPage());
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Órdenes activas" })).toBeInTheDocument();
    expect(screen.getByText("No hay trabajos en proceso.")).toBeInTheDocument();
    const actionButtons = screen.getAllByRole("button", { name: "Agregar trabajo" });
    expect(actionButtons.length).toBeGreaterThanOrEqual(1);
  });
});