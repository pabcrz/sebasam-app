import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("@/features/work-orders/components/work-order-completed-list", () => ({ WorkOrderCompletedList: vi.fn(() => null) }));
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
vi.mock("@/features/payments/queries", () => ({ getNotePaymentHistory: vi.fn().mockResolvedValue(new Map()) }));
vi.mock("@/features/quotes/actions", () => ({ archiveCompletedNote: vi.fn(), correctCompletedWorkQuoteFromWorkspace: vi.fn(), getOrCreateSharedQuoteAction: vi.fn(), revokeNoteCanonicalLinkAction: vi.fn() }));
import { getNotePaymentHistory } from "@/features/payments/queries";
import { getCurrentProfile, isAdminRole } from "@/lib/auth/session";
import { WorkOrderCompletedList } from "@/features/work-orders/components/work-order-completed-list";
import { parseNotasParams } from "@/features/work-orders/notas-period";
import { recordPaymentAction } from "@/features/payments/actions";
import { getOrCreateSharedQuoteAction } from "@/features/quotes/actions";
import { rollbackWorkOrderAction } from "@/features/work-orders/actions";
const raw = {
  mode: "week", anchor: "2026-08-05", payment: "partial", kind: "WORK",
  assignee: "workshop", customerId: "cust-1", overdue: "overdue",
  number: "N-42", concept: "aceite", plate: "ABC-123", economicNumber: "ECO-42",
  dateFrom: "2026-08-01", dateTo: "2026-08-31",
  showArchived: "true", showCancelled: "true", page: "2",
};
const totals = { totalPendingCents: 250_000, totalOverdueCents: 50_000, totalPaidCents: 150_000 };
const items = [{ id: "work-1", quote: { id: "quote-1", totalCents: 10000, hasRevocablePublicLink: true } }, { id: "sale-1", quote: { id: "quote-sale", totalCents: 20000, hasRevocablePublicLink: false } }];
function urlValues(href: string) { return Object.fromEntries(new URL(href, "http://fixture").searchParams); }
import { createDirectOperationFromWorkspace } from "@/features/work-orders/actions";
import NotasPage from "./page";
describe("NotasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCompletedWorkOrders.mockResolvedValue({ workOrders: [], page: 1, hasNextPage: false, totals });
    vi.mocked(getNotePaymentHistory).mockResolvedValue(new Map());
    vi.mocked(isAdminRole).mockReturnValue(false);
  });
  it("renders the workspace without a redundant page header card and with Nueva nota trigger", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Notas emitidas (WORK y SALE)" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /nueva nota/i }).length).toBeGreaterThan(0);
  });

  it("renders financial totals cards for pending, overdue, and paid amounts", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Pendiente de notas seleccionadas")).toBeInTheDocument();
    expect(screen.getByText("Vencido de notas seleccionadas")).toBeInTheDocument();
    expect(screen.getByText("Cobrado acumulado de notas")).toBeInTheDocument();
    expect(screen.getByText("$2,500.00")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
    expect(screen.queryByText("Cobrado en periodo")).not.toBeInTheDocument();
    expect(screen.getByText(/no representan toda la cartera ni movimientos de cobro del periodo/)).toBeInTheDocument();
  });

  it("renders actionable empty state with Limpiar filtros button when no work orders exist", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({ anchor: "2026-08-05" }) }));
    expect(screen.getByText("Limpiar filtros")).toBeInTheDocument();
    expect(screen.getByText("No hay notas WORK o SALE que coincidan con este periodo y los filtros seleccionados.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/admin/notas?mode=week&anchor=2026-08-05&payment=all&kind=all");
  });

  it("wires both direct-note dialogs to the discriminated operation action", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));

    const dialogProps = quoteBuilderDialogProps.mock.calls.map(([props]) => props);
    const noteDialogs = dialogProps.filter((props) => props.mode === "direct-note");
    expect(noteDialogs).toHaveLength(2);
    expect(noteDialogs.every((props) => props.createAction === createDirectOperationFromWorkspace)).toBe(true);
  });

  it("forwards full effective criteria and opt-in, and preserves pagination/return URLs", async () => {
    listCompletedWorkOrders.mockResolvedValue({ workOrders: items, totals, page: 2, hasNextPage: true });
    vi.mocked(getNotePaymentHistory).mockResolvedValue(new Map([["work-1", { totalCents: 10000, payments: [] }]]));
    render(await NotasPage({ searchParams: Promise.resolve(raw) }));
    expect(listCompletedWorkOrders).toHaveBeenCalledExactlyOnceWith(parseNotasParams(raw, undefined, { operationalFilters: true }), { operationalFilters: true });
    expect(getNotePaymentHistory).toHaveBeenCalledExactlyOnceWith(["work-1", "sale-1"]);
    expect(screen.getByText("Concepto: aceite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parciales" })).toHaveAttribute("aria-pressed", "true");
    const { page: ignoredPage, ...firstPage } = raw;
    void ignoredPage;
    expect(urlValues(screen.getByRole("link", { name: "Página anterior" }).getAttribute("href")!)).toEqual(firstPage);
    expect(urlValues(screen.getByRole("link", { name: "Página siguiente" }).getAttribute("href")!)).toEqual({ ...raw, page: "3" });
    const props = vi.mocked(WorkOrderCompletedList).mock.calls[0][0];
    expect(urlValues(props.noteReturnTo!)).toEqual(raw);
    expect(props.workOrders).toBe(items);
    expect(Array.from(props.quoteMap?.keys() ?? [])).toEqual(["quote-1", "quote-sale"]);
    expect(props.paymentHistories).toEqual([{ workOrderId: "work-1", totalCents: 10000, payments: [] }, { workOrderId: "sale-1", totalCents: 20000, payments: [] }]);
    expect(props.shareAction).toBe(getOrCreateSharedQuoteAction);
    expect(props.rollbackAction).toBe(rollbackWorkOrderAction);
  });

  it.each(["all", "SALE"])("normalizes inactive responsible for %s in query and return context", async (kind) => {
    listCompletedWorkOrders.mockResolvedValue({ workOrders: items, totals, page: 2, hasNextPage: false });
    await NotasPage({ searchParams: Promise.resolve({ ...raw, kind }) });
    expect(listCompletedWorkOrders.mock.calls[0][0]).toMatchObject({ kind, assignee: "all", payment: "partial", showArchived: true, showCancelled: true });
    render(await NotasPage({ searchParams: Promise.resolve({ ...raw, kind }) }));
    const { assignee: ignored, ...expected } = raw;
    void ignored;
    expect(urlValues(vi.mocked(WorkOrderCompletedList).mock.calls[0][0].noteReturnTo!)).toEqual({ ...expected, kind });
  });

  it.each([true, false])("retains existing admin-gated action arrays (admin=%s)", async (admin) => {
    vi.mocked(isAdminRole).mockReturnValue(admin);
    vi.mocked(getCurrentProfile).mockResolvedValue({ profile: { role: admin ? "ADMIN" : "WORKER" } } as never);
    listCompletedWorkOrders.mockResolvedValue({ workOrders: items, totals, page: 1, hasNextPage: false });
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    const props = vi.mocked(WorkOrderCompletedList).mock.calls[0][0];
    expect(isAdminRole).toHaveBeenCalledWith(admin ? "ADMIN" : "WORKER");
    for (const actions of [props.recordPaymentActions, props.correctWorkOrderActions, props.archiveRevocationActions]) expect(actions).toHaveLength(admin ? 2 : 0);
    if (admin) {
      await props.recordPaymentActions![0].action("10", "test-operation", "CASH");
      expect(recordPaymentAction).toHaveBeenCalledExactlyOnceWith("work-1", "10", "test-operation", "CASH");
      expect(props.archiveRevocationActions?.map((a) => a.canRevoke)).toEqual([true, false]);
    }
  });

  it("rejects incoming reversed dates without note/history queries or false metrics/results", async () => {
    const view = render(await NotasPage({ searchParams: Promise.resolve({ ...raw, dateFrom: "2026-09-01" }) }));
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
    expect(screen.getByLabelText("Finalización/emisión desde")).toHaveValue("2026-09-01");
    expect(screen.getByLabelText("Finalización/emisión hasta")).toHaveValue("2026-08-31");
    expect(screen.getByLabelText("Concepto")).toHaveValue("aceite");
    expect(screen.queryByText("Cobrado acumulado de notas")).not.toBeInTheDocument();
    expect(screen.queryByText(/No hay notas/)).not.toBeInTheDocument();
    expect(listCompletedWorkOrders).not.toHaveBeenCalled();
    expect(getNotePaymentHistory).not.toHaveBeenCalled();
    expect(WorkOrderCompletedList).not.toHaveBeenCalled();
    view.rerender(await NotasPage({ searchParams: Promise.resolve({ ...raw, dateFrom: "2026-10-01", concept: "nuevo rango" }) }));
    expect(screen.getByLabelText("Finalización/emisión desde")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Concepto")).toHaveValue("nuevo rango");
    expect(listCompletedWorkOrders).not.toHaveBeenCalled();
    expect(getNotePaymentHistory).not.toHaveBeenCalled();
  });
});
