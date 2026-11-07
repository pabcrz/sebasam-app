import type { Metadata } from "next";
import Link from "next/link";
import {
  approveQuoteAndCreateWorkOrderFromForm,
  cancelQuoteFromForm,
  getOrCreateSharedQuoteAction,
  publishSharedQuote,
  authorizeQuoteAction,
  correctQuoteDecisionAction,
  duplicateQuoteFromForm,
  deleteQuoteFromForm,
  createQuoteFromWorkspace,
  updateDraftQuoteFromWorkspace,
  archiveQuote,
  restoreArchivedQuote,
} from "@/features/quotes/actions";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { listPaginatedQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import { getOrCreatePaymentRequestForQuote } from "@/features/payment-requests/actions";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { quoteFilterSchema, type QuoteFilterInput } from "@/features/quotes/schemas";
import { QuoteListCard } from "@/features/quotes/components/quote-mobile-card";
import { QuotePageToasts } from "@/features/quotes/components/quote-page-toasts";
import { QuoteFilters } from "@/features/quotes/components/quote-filters";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { hasFilterValue } from "@/lib/filters";
import {
  quoteStatusLabels,
  quoteStatusBadgeVariant,
} from "@/features/quotes/lib/status";
import { filterPaymentRequestDialogBankAccounts } from "@/features/quotes/lib/payment-request-dialog-context";
import {
  createAndAssignWorkOrderAction,
  completeWorkOrderAction,
  convertQuoteToNoteOperationAction,
  rollbackWorkOrderAction,
} from "@/features/work-orders/actions";

import { listActiveWorkers } from "@/features/work-orders/queries";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

type QuotesPageProps = {
  searchParams: Promise<{
    approved?: string;
    created?: string;
    shared?: string;
    duplicated?: string;
    error?: string;
    status?: string;
    customerId?: string;
    number?: string;
    plate?: string;
    dateFrom?: string;
    dateTo?: string;
    showCancelled?: string;
    showArchived?: string;
    page?: string;
  }>;
};

function quotesPageHref(filters: QuoteFilterInput, page: number) {
  const searchParams = new URLSearchParams({ page: String(page) });

  if (filters.status) searchParams.set("status", filters.status);
  if (filters.customerId) searchParams.set("customerId", filters.customerId);
  if (filters.number) searchParams.set("number", filters.number);
  if (filters.plate) searchParams.set("plate", filters.plate);
  if (filters.dateFrom) searchParams.set("dateFrom", filters.dateFrom.toISOString().slice(0, 10));
  if (filters.dateTo) searchParams.set("dateTo", filters.dateTo.toISOString().slice(0, 10));
  if (filters.showCancelled) searchParams.set("showCancelled", "true");
  if (filters.showArchived) searchParams.set("showArchived", "true");

  return `/admin/quotes?${searchParams.toString()}`;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const parsedFilters = quoteFilterSchema.safeParse(params);
  const filters = parsedFilters.success ? parsedFilters.data : {} as QuoteFilterInput;
  const hasFilters = hasFilterValue({ ...filters, showCancelled: filters.showCancelled || undefined, showArchived: filters.showArchived || undefined });
  const [customers, quotePage, paymentSettings, workers] = await Promise.all([
    listCustomers(),
    listPaginatedQuotes(params, { operationalQueue: "quotes" }),
    getPaymentSettings(),
    listActiveWorkers(),
  ]);
  const { quotes, page, hasNextPage } = quotePage;
  const eligiblePaymentRequestBankAccounts = filterPaymentRequestDialogBankAccounts(paymentSettings.bankAccounts);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Cotizaciones
        </h1>
        <div className="hidden sm:block">
          <QuoteBuilderDialog customers={customers} createAction={createQuoteFromWorkspace} createCustomerAction={createOrReuseCustomerForQuote} searchCustomersAction={searchCustomersForQuote} />
        </div>
        <Link href="/admin/quotes/retention" className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] px-3 py-2 text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]">Archivo y papelera</Link>
      </div>
      <QuotePageToasts />

      <section aria-labelledby="recent-quotes-heading" className="grid min-w-0 gap-4">
        <h2 id="recent-quotes-heading" className="sr-only">Cotizaciones recientes</h2>
        <QuoteFilters filters={filters} customers={customers} />

      <div className="grid auto-rows-fr gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        {quotes.map((quote) => (
          <QuoteListCard
            key={quote.id}
            quote={quote}
            quoteStatusLabels={quoteStatusLabels}
            quoteStatusBadgeVariant={quoteStatusBadgeVariant}
            approveAction={approveQuoteAndCreateWorkOrderFromForm}
            cancelAction={cancelQuoteFromForm}
            shareAction={(quote.status === "DRAFT" ? publishSharedQuote : getOrCreateSharedQuoteAction).bind(null, quote.id)}
            authorizeAction={authorizeQuoteAction.bind(null, quote.id)}
            correctDecisionAction={correctQuoteDecisionAction}
            paymentRequestAction={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
            paymentRequestBankAccounts={eligiblePaymentRequestBankAccounts}
            duplicateAction={duplicateQuoteFromForm}
            deleteAction={deleteQuoteFromForm}
            archiveAction={archiveQuote.bind(null, quote.id)}
            restoreAction={restoreArchivedQuote.bind(null, quote.id)}
            customers={customers}
            saveAction={updateDraftQuoteFromWorkspace.bind(null, quote.id)}
            searchCustomersAction={searchCustomersForQuote}
            workers={workers}
            workOrderActions={{
              convert: convertQuoteToNoteOperationAction,
              assign: createAndAssignWorkOrderAction.bind(null, quote.id),
              complete: completeWorkOrderAction,
              rollback: rollbackWorkOrderAction,
            }}

          />
        ))}
        {quotes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No se encontraron cotizaciones.
            </p>
            {hasFilters ? (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                <Link href="/admin/quotes" className="text-[var(--color-primary)] hover:underline">
                  Limpiar filtros
                </Link>{" "}
                o crea una nueva cotización.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Crea una nueva cotización para comenzar.
              </p>
            )}
          </div>
        ) : null}
      </div>
      {quotes.length > 0 || page > 1 ? (
        <nav aria-label="Paginación de cotizaciones" className="mt-6 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={quotesPageHref(filters, page - 1)} className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] px-3 py-2 text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]">
              Anterior
            </Link>
          ) : (
            <button type="button" disabled className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60">
              Anterior
            </button>
          )}
          <span aria-live="polite" className="text-sm text-[var(--color-text-muted)]">Página {page}</span>
          {hasNextPage ? (
            <Link href={quotesPageHref(filters, page + 1)} className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] px-3 py-2 text-sm font-medium text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]">
              Siguiente
            </Link>
          ) : (
            <button type="button" disabled className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60">
              Siguiente
            </button>
          )}
        </nav>
      ) : null}
      </section>

      {/* Mobile Floating Action Button */}
      <div
        className="fixed right-4 z-40 sm:hidden"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <QuoteBuilderDialog
          customers={customers}
          createAction={createQuoteFromWorkspace}
          createCustomerAction={createOrReuseCustomerForQuote}
          searchCustomersAction={searchCustomersForQuote}
          triggerVariant="primary"
          triggerSize="sm"
          triggerClassName="h-11 px-4 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-1.5 border border-white/20"
        />
      </div>
    </section>
  );
}
