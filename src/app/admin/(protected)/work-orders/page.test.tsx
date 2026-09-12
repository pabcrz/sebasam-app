import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/features/work-orders/queries", () => ({ listActiveWorkOrders: vi.fn().mockResolvedValue([]), listActiveWorkers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/queries", () => ({ listCustomers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/quotes/queries", () => ({ listQuotesByIds: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/actions", () => ({
  searchCustomersForQuote: vi.fn(),
  createOrReuseCustomerForQuote: vi.fn(),
}));
vi.mock("@/features/quotes/actions", () => ({
  duplicateQuoteFromForm: vi.fn(),
  getOrCreateSharedQuoteAction: vi.fn(),
  updateDraftQuoteFromWorkspace: vi.fn(),
}));
vi.mock("@/features/work-orders/actions", () => ({
  assignWorkOrderAction: vi.fn(),
  completeWorkOrderAction: vi.fn(),
  rollbackWorkOrderAction: vi.fn(),
  createDirectWorkOrderFromWorkspace: vi.fn(),
}));
vi.mock("@/features/work-orders/components/work-order-active-list", () => ({ WorkOrderActiveList: () => null }));
import WorkOrdersPage from "./page";
import { listActiveWorkOrders } from "@/features/work-orders/queries";
import { listQuotesByIds } from "@/features/quotes/queries";
describe("WorkOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listActiveWorkOrders).mockResolvedValue([]);
    vi.mocked(listQuotesByIds).mockResolvedValue([]);
  });

  it("renders the workspace without a redundant page header card and with direct work order action", async () => {
    render(await WorkOrdersPage());
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Órdenes activas" })).toBeInTheDocument();
    expect(screen.getByText("No hay trabajos en proceso.")).toBeInTheDocument();
    const actionButtons = screen.getAllByRole("button", { name: "Agregar trabajo" });
    expect(actionButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("loads unique quote ids from active work orders without querying when there are none", async () => {
    vi.mocked(listActiveWorkOrders).mockResolvedValue([
      { quote: { id: "active-quote-1" } },
      { quote: { id: "active-quote-1" } },
      { quote: { id: "active-quote-2" } },
    ] as never);

    await WorkOrdersPage();

    expect(listQuotesByIds).toHaveBeenCalledWith(["active-quote-1", "active-quote-2"]);
  });

  it("does not query quotes when there are no active work orders", async () => {
    await WorkOrdersPage();

    expect(listQuotesByIds).not.toHaveBeenCalled();
  });
});
