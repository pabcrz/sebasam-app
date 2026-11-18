import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/features/work-orders/queries", () => ({ listActiveWorkOrders: vi.fn().mockResolvedValue([]), listPaginatedActiveWorkOrders: vi.fn().mockResolvedValue({ workOrders: [], page: 1, hasNextPage: false }), listActiveWorkers: vi.fn().mockResolvedValue([]), countActiveWorkOrders: vi.fn().mockResolvedValue(3), countCompletedWorkOrders: vi.fn().mockResolvedValue(9) }));
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
vi.mock("@/features/work-orders/components/work-order-active-list", () => ({ WorkOrderActiveList: vi.fn(() => null) }));
import WorkOrdersPage from "./page";
import { listActiveWorkOrders, listPaginatedActiveWorkOrders, listActiveWorkers } from "@/features/work-orders/queries";
import { listQuotesByIds } from "@/features/quotes/queries";
import { WorkOrderActiveList } from "@/features/work-orders/components/work-order-active-list";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { assignWorkOrderAction, completeWorkOrderAction, rollbackWorkOrderAction, createDirectWorkOrderFromWorkspace } from "@/features/work-orders/actions";
import { duplicateQuoteFromForm, getOrCreateSharedQuoteAction, updateDraftQuoteFromWorkspace } from "@/features/quotes/actions";
vi.mock("@/features/quotes/components/quote-builder-dialog", () => ({ QuoteBuilderDialog: vi.fn(({ triggerLabel }) => <button>{triggerLabel}</button>) }));
const params = {
  number: "OT-42", concept: "aceite", customerId: "customer-1", plate: "ABC-123", economicNumber: "ECO-42",
  dateFrom: "2026-08-01", dateTo: "2026-08-31", execution: "PLANNED", assignee: "workshop",
  scheduledFrom: "2026-09-01", scheduledTo: "2026-09-30", page: "2",
};
const canonical = "/admin/work-orders?number=OT-42&concept=aceite&customerId=customer-1&plate=ABC-123&economicNumber=ECO-42&dateFrom=2026-08-01&dateTo=2026-08-31&execution=PLANNED&assignee=workshop&scheduledFrom=2026-09-01&scheduledTo=2026-09-30";
const orders = [{ quote: { id: "active-quote-1" } }, { quote: { id: "active-quote-1" } }, { quote: { id: "active-quote-2" } }];
function page(searchParams: Record<string, string> = {}) {
  return WorkOrdersPage({ searchParams: Promise.resolve(searchParams) });
}
describe("WorkOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listActiveWorkOrders).mockResolvedValue([]);
    vi.mocked(listPaginatedActiveWorkOrders).mockResolvedValue({ workOrders: [], page: 1, hasNextPage: false });
    vi.mocked(listActiveWorkers).mockResolvedValue([]);
    vi.mocked(listQuotesByIds).mockResolvedValue([]);
  });

  it("shows the counts as the header subtitle and as Activos / Completados tabs in the search row, without En espera", async () => {
    render(await page());

    expect(screen.getByTestId("page-header")).toHaveTextContent("3 activos · 9 completados");
    const nav = screen.getByRole("navigation", { name: "Secciones de trabajos" });
    expect(within(nav).getByRole("link", { name: /Activos/ })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /Activos/ })).toHaveTextContent("3");
    expect(within(nav).getByRole("link", { name: /Completados/ })).toHaveTextContent("9");
    expect(within(nav).queryByText(/En espera/)).not.toBeInTheDocument();
    expect(nav.closest("[data-testid=work-order-search-row]")).toContainElement(screen.getByRole("search"));
  });

  it("renders the workspace without a redundant page header card and with direct work order action", async () => {
    render(await page());
    expect(within(screen.getByTestId("page-header")).getByRole("heading", { level: 1, name: "Trabajos" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Trabajos en proceso" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Órdenes activas" })).toBeInTheDocument();
    expect(screen.getByText("No hay trabajos en proceso.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Agregar trabajo" })).toHaveLength(1);
    expect(screen.getByTestId("page-header")).toContainElement(screen.getByRole("button", { name: "Agregar trabajo" }));
    expect(screen.getByText(/aun sin maestro asignado/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Siguiente" })).not.toBeInTheDocument();
  });

  it("loads unique quote ids from active work orders without querying when there are none", async () => {
    vi.mocked(listPaginatedActiveWorkOrders).mockResolvedValue({ workOrders: orders, page: 1, hasNextPage: false } as never);

    await page();

    expect(listQuotesByIds).toHaveBeenCalledExactlyOnceWith(["active-quote-1", "active-quote-2"]);
    expect(listActiveWorkOrders).not.toHaveBeenCalled();
  });

  it("does not query quotes when there are no active work orders", async () => {
    await page();

    expect(listQuotesByIds).not.toHaveBeenCalled();
  });

  it("forwards every criterion before page-limited hydration and preserves pagination URLs", async () => {
    vi.mocked(listPaginatedActiveWorkOrders).mockResolvedValue({ workOrders: orders, page: 2, hasNextPage: true } as never);
    vi.mocked(listQuotesByIds).mockResolvedValue([{ id: "active-quote-1" }] as never);
    render(await page(params));
    expect(listPaginatedActiveWorkOrders).toHaveBeenCalledExactlyOnceWith(params);
    expect(listActiveWorkOrders).not.toHaveBeenCalled();
    expect(listQuotesByIds).toHaveBeenCalledExactlyOnceWith(["active-quote-1", "active-quote-2"]);
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute("href", canonical);
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute("href", `${canonical}&page=3`);
    expect(screen.getByText("Página 2 · 3 trabajos en esta página")).toBeInTheDocument();
    const props = vi.mocked(WorkOrderActiveList).mock.calls[0][0];
    expect(props.workOrders).toBe(orders);
    expect(Array.from(props.quoteMap.keys())).toEqual(["active-quote-1"]);
    expect(props.workOrderActions).toEqual({ assign: assignWorkOrderAction, complete: completeWorkOrderAction, rollback: rollbackWorkOrderAction });
    expect(props.duplicateQuoteAction).toBe(duplicateQuoteFromForm);
    expect(props.shareAction).toBe(getOrCreateSharedQuoteAction);
    expect(props.saveQuoteActions).toHaveLength(3);
    await props.saveQuoteActions[0]({}, new FormData());
    expect(updateDraftQuoteFromWorkspace).toHaveBeenCalledWith("active-quote-1", {}, expect.any(FormData));
  });

  it("distinguishes filtered-empty and keeps the single direct create entry with master choices", async () => {
    const master = { id: "11111111-1111-4111-8111-111111111111", role: "WORKER", workerKind: "MASTER", displayName: "Maestro" };
    vi.mocked(listActiveWorkers).mockResolvedValue([master, { ...master, id: "helper", workerKind: "HELPER" }] as never);
    render(await page({ concept: "sin coincidencias" }));
    expect(screen.getByText("No hay trabajos que coincidan con los filtros.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/admin/work-orders");
    expect(screen.queryByText("No hay trabajos en proceso.")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Agregar trabajo" })).toHaveLength(1);
    for (const [props] of vi.mocked(QuoteBuilderDialog).mock.calls) {
      expect(props).toMatchObject({ mode: "direct-work-order", createAction: createDirectWorkOrderFromWorkspace, masters: [master] });
    }
    expect(listQuotesByIds).not.toHaveBeenCalled();
  });

  it.each([
    [{ dateFrom: "2026-08-31", dateTo: "2026-08-01" }, "La fecha operativa desde no puede ser posterior a hasta"],
    [{ scheduledFrom: "2026-09-30", scheduledTo: "2026-09-01" }, "La programación desde no puede ser posterior a hasta"],
  ])("renders correctable incoming %j without any work/quote query", async (dates, message) => {
    const input = { ...params, ...dates };
    render(await page(input));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    for (const [key, label] of [["dateFrom", "Fecha operativa desde"], ["dateTo", "Fecha operativa hasta"], ["scheduledFrom", "Programación desde"], ["scheduledTo", "Programación hasta"]] as const) {
      expect(screen.getByLabelText(label)).toHaveValue(input[key]);
    }
    expect(screen.getByLabelText("Concepto")).toHaveValue("aceite");
    expect(screen.getByRole("combobox", { name: "Responsable" })).toHaveTextContent("Taller especial");
    expect(screen.queryByText(/No hay trabajos/)).not.toBeInTheDocument();
    expect(listPaginatedActiveWorkOrders).not.toHaveBeenCalled();
    expect(listActiveWorkOrders).not.toHaveBeenCalled();
    expect(listQuotesByIds).not.toHaveBeenCalled();
  });
});
