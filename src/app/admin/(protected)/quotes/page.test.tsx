import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listCustomers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPaginatedQuotes = vi.hoisted(() => vi.fn().mockResolvedValue({ quotes: [], page: 1, hasNextPage: false }));
const getPaymentSettings = vi.hoisted(() => vi.fn().mockResolvedValue({ bankAccounts: [] }));
const publishSharedQuote = vi.hoisted(() => vi.fn());
const getOrCreateSharedQuoteAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/customers/queries", () => ({ listCustomers }));
vi.mock("@/features/quotes/queries", () => ({ listPaginatedQuotes }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));
vi.mock("@/features/work-orders/queries", () => ({ listActiveWorkers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/actions", () => ({ createOrReuseCustomerForQuote: vi.fn(), searchCustomersForQuote: vi.fn() }));
vi.mock("@/features/payment-requests/actions", () => ({ getOrCreatePaymentRequestForQuote: vi.fn() }));
vi.mock("@/features/quotes/actions", () => ({
  approveQuoteAndCreateWorkOrderFromForm: vi.fn(), cancelQuoteFromForm: vi.fn(), publishSharedQuote, getOrCreateSharedQuoteAction,
  authorizeQuoteAction: vi.fn(), correctQuoteDecisionAction: vi.fn(), duplicateQuoteFromForm: vi.fn(),
  deleteQuoteFromForm: vi.fn(), createQuoteFromWorkspace: vi.fn(), updateDraftQuoteFromWorkspace: vi.fn(),
  archiveQuote: vi.fn(), restoreArchivedQuote: vi.fn(),
}));
vi.mock("@/features/work-orders/actions", () => ({
  createAndAssignWorkOrderAction: vi.fn(), completeWorkOrderAction: vi.fn(), convertQuoteToNoteOperationAction: vi.fn(), rollbackWorkOrderAction: vi.fn(),
}));
vi.mock("@/features/quotes/components/quote-builder-dialog", () => ({
  QuoteBuilderDialog: () => <button type="button">Nueva cotización</button>,
}));
vi.mock("@/features/quotes/components/quote-mobile-card", () => ({
  QuoteListCard: ({ quote, shareAction }: { quote: { id: string }; shareAction: () => Promise<unknown> }) => (
    <button type="button" data-quote-id={quote.id} onClick={() => void shareAction()}>Share {quote.id}</button>
  ),
}));
vi.mock("@/features/quotes/components/quote-page-toasts", () => ({ QuotePageToasts: () => null }));

import QuotesPage from "./page";

describe("QuotesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPaginatedQuotes.mockResolvedValue({ quotes: [], page: 1, hasNextPage: false });
  });

  it("routes DRAFT sharing through publication and keeps other shareable quotes on the existing action", async () => {
    const user = userEvent.setup();
    const draft = { id: "draft-quote", status: "DRAFT" };
    const sent = { id: "sent-quote", status: "SENT" };
    listPaginatedQuotes.mockResolvedValue({ quotes: [draft, sent], page: 1, hasNextPage: false });
    publishSharedQuote.mockResolvedValue({ success: true });
    getOrCreateSharedQuoteAction.mockResolvedValue({ success: true });

    render(await QuotesPage({ searchParams: Promise.resolve({}) }));
    await user.click(screen.getByRole("button", { name: "Share draft-quote" }));
    await user.click(screen.getByRole("button", { name: "Share sent-quote" }));

    expect(publishSharedQuote).toHaveBeenCalledWith("draft-quote");
    expect(getOrCreateSharedQuoteAction).toHaveBeenCalledWith("sent-quote");
  });

  it("renders the workspace without a redundant page header card", async () => {
    render(await QuotesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Nueva cotización" })[0]).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Cotizaciones" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cotizaciones recientes" })).toBeInTheDocument();
  });

  it("keeps one primary create action at the end of the page header, with one search and the filter sheet", async () => {
    render(await QuotesPage({ searchParams: Promise.resolve({}) }));

    const header = screen.getByTestId("page-header");
    expect(within(header).getByRole("heading", { level: 1, name: "Cotizaciones" })).toBeInTheDocument();
    expect(header.lastElementChild?.lastElementChild).toHaveTextContent("Nueva cotización");
    expect(screen.getAllByRole("button", { name: "Nueva cotización" })).toHaveLength(1);
    expect(screen.getByRole("searchbox", { name: "Buscar por folio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^filtros/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más acciones de la página" })).toBeInTheDocument();
  });

  it("groups the list accessibly without an outer card or decorated filter panel", async () => {
    render(await QuotesPage({ searchParams: Promise.resolve({}) }));

    const region = screen.getByRole("region", { name: "Cotizaciones recientes" });
    expect(screen.getByRole("heading", { level: 2, name: "Cotizaciones recientes" })).toHaveClass("sr-only");
    expect([...region.querySelectorAll(":scope > div")].some((element) =>
      element.classList.contains("bg-[var(--color-bg-soft)]") ||
      element.classList.contains("shadow-[var(--shadow-card)]"),
    )).toBe(false);
  });

  it("uses equal-height quote cards in a two-column grid", async () => {
    render(await QuotesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No se encontraron cotizaciones.").parentElement?.parentElement).toHaveClass(
      "grid",
      "auto-rows-fr",
      "lg:grid-cols-[repeat(2,minmax(0,1fr))]",
    );
  });
});


describe("Quotes operational page wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPaginatedQuotes.mockResolvedValue({ quotes: [], page: 2, hasNextPage: true });
  });

  it("queries the operational contract and preserves all combined criteria on both pagination links", async () => {
    const params = { number: "C-42", concept: "aceite", customerId: "cust-1", plate: "ABC", economicNumber: "ECO", kind: "SALE", status: "APPROVED", hasWorkOrder: "false", showArchived: "true", showCancelled: "true", dateFrom: "2026-08-01", dateTo: "2026-08-31", page: "2" };
    render(await QuotesPage({ searchParams: Promise.resolve(params) }));
    expect(listPaginatedQuotes).toHaveBeenCalledExactlyOnceWith(params, { operationalQueue: "quotes", operationalFilters: true });
    for (const [label, page] of [["Anterior", null], ["Siguiente", "3"]] as const) {
      const url = new URL(screen.getByRole("link", { name: label }).getAttribute("href")!, "https://example.test");
      for (const [key, value] of Object.entries(params)) expect(url.searchParams.get(key)).toBe(key === "page" ? page : value);
    }
    expect(screen.getByRole("link", { name: "Limpiar filtros" })).toHaveAttribute("href", "/admin/quotes");
  });

  it("represents inverted incoming dates safely without querying unfiltered results", async () => {
    render(await QuotesPage({ searchParams: Promise.resolve({ customerId: "cust-1", dateFrom: "2026-08-31", dateTo: "2026-08-01" }) }));
    expect(screen.getByRole("alert")).toHaveTextContent("La fecha operativa desde no puede ser posterior a hasta");
    expect(listPaginatedQuotes).not.toHaveBeenCalled();
    expect(screen.queryByText("No se encontraron cotizaciones.")).not.toBeInTheDocument();
  });
});
