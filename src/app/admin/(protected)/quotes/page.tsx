import type { Metadata } from "next";
import Link from "next/link";
import {
  approveQuoteAndCreateWorkOrderFromForm,
  cancelDraftQuoteFromForm,
  shareQuoteFromForm,
  authorizeQuoteAction,
  duplicateQuoteFromForm,
  createQuoteFromWorkspace,
  updateDraftQuoteFromWorkspace,
} from "@/features/quotes/actions";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import { getOrCreatePaymentRequestForQuote } from "@/features/payment-requests/actions";
import { recordCashPaymentAction } from "@/features/payments/actions";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { quoteFilterSchema, type QuoteFilterInput } from "@/features/quotes/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
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
  assignWorkOrderAction,
  ensureWorkOrderWaitingAction,
  recordExecutionAction,
  removeExecutionRecordAction,
  startWorkOrderAction,
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
  }>;
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const parsedFilters = quoteFilterSchema.safeParse(params);
  const filters = parsedFilters.success ? parsedFilters.data : {} as QuoteFilterInput;
  const hasFilters = hasFilterValue(filters);
  const [customers, quotes, paymentSettings, workers] = await Promise.all([
    listCustomers(),
    listQuotes(filters, { excludeWithActiveWorkOrder: true }),
    getPaymentSettings(),
    listActiveWorkers(),
  ]);
  const eligiblePaymentRequestBankAccounts = filterPaymentRequestDialogBankAccounts(paymentSettings.bankAccounts);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Card>
        <CardHeader>
          <CardDescription>Gestión de cotizaciones</CardDescription>
          <CardTitle as="h1">Cotizaciones en borrador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
            Crea cotizaciones en borrador para clientes existentes con subtotales y totales calculados en el servidor.
          </p>
          <QuotePageToasts />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <QuoteBuilderDialog customers={customers} createAction={createQuoteFromWorkspace} createCustomerAction={createOrReuseCustomerForQuote} searchCustomersAction={searchCustomersForQuote} />
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Cotizaciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
            <QuoteFilters filters={filters} customers={customers} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {quotes.map((quote) => (
              <QuoteListCard
                key={quote.id}
                quote={quote}
                quoteStatusLabels={quoteStatusLabels}
                quoteStatusBadgeVariant={quoteStatusBadgeVariant}
                approveAction={approveQuoteAndCreateWorkOrderFromForm}
                cancelAction={cancelDraftQuoteFromForm}
                shareAction={shareQuoteFromForm}
                authorizeAction={authorizeQuoteAction.bind(null, quote.id)}
                paymentRequestAction={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
                paymentRequestBankAccounts={eligiblePaymentRequestBankAccounts}
                cashPaymentAction={recordCashPaymentAction.bind(null, quote.id)}
                duplicateAction={duplicateQuoteFromForm}
                customers={customers}
                saveAction={updateDraftQuoteFromWorkspace.bind(null, quote.id)}
                searchCustomersAction={searchCustomersForQuote}
                workers={workers}
                workOrderActions={{
                  ensureWaiting: ensureWorkOrderWaitingAction.bind(null, quote.id),
                  assign: assignWorkOrderAction,
                  start: startWorkOrderAction,
                  recordExecution: recordExecutionAction,
                  removeExecution: removeExecutionRecordAction,
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
        </CardContent>
      </Card>
    </section>
  );
}
