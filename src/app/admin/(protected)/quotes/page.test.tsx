import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const listCustomers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const listPaginatedQuotes = vi.hoisted(() => vi.fn().mockResolvedValue({ quotes: [], page: 1, hasNextPage: false }));
const getPaymentSettings = vi.hoisted(() => vi.fn().mockResolvedValue({ bankAccounts: [] }));

vi.mock("@/features/customers/queries", () => ({ listCustomers }));
vi.mock("@/features/quotes/queries", () => ({ listPaginatedQuotes }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));
vi.mock("@/features/work-orders/queries", () => ({ listActiveWorkers: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/customers/actions", () => ({ createOrReuseCustomerForQuote: vi.fn(), searchCustomersForQuote: vi.fn() }));
vi.mock("@/features/payment-requests/actions", () => ({ getOrCreatePaymentRequestForQuote: vi.fn() }));
vi.mock("@/features/quotes/actions", () => ({
  approveQuoteAndCreateWorkOrderFromForm: vi.fn(), cancelQuoteFromForm: vi.fn(), publishSharedQuote: vi.fn(),
  authorizeQuoteAction: vi.fn(), correctQuoteDecisionAction: vi.fn(), duplicateQuoteFromForm: vi.fn(),
  deleteQuoteFromForm: vi.fn(), createQuoteFromWorkspace: vi.fn(), updateDraftQuoteFromWorkspace: vi.fn(),
  archiveQuote: vi.fn(), restoreArchivedQuote: vi.fn(),
}));
vi.mock("@/features/work-orders/actions", () => ({
  createAndAssignWorkOrderAction: vi.fn(), completeWorkOrderAction: vi.fn(), rollbackWorkOrderAction: vi.fn(),
}));
vi.mock("@/features/quotes/components/quote-builder-dialog", () => ({
  QuoteBuilderDialog: () => <button type="button">Nueva cotización</button>,
}));
vi.mock("@/features/quotes/components/quote-mobile-card", () => ({ QuoteListCard: () => null }));
vi.mock("@/features/quotes/components/quote-page-toasts", () => ({ QuotePageToasts: () => null }));
vi.mock("@/features/quotes/components/quote-filters", () => ({ QuoteFilters: () => null }));

import QuotesPage from "./page";

describe("QuotesPage", () => {
  it("renders the workspace without a redundant page header card", async () => {
    render(await QuotesPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva cotización" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cotizaciones recientes" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Cotizaciones" })).not.toBeInTheDocument();
  });
});