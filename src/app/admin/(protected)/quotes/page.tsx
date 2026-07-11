import type { Metadata } from "next";
import Link from "next/link";
import {
  createQuoteFromForm,
  approveQuoteAndCreateWorkOrderFromForm,
  cancelDraftQuoteFromForm,
  shareQuoteFromForm,
  authorizeQuoteAction,
  duplicateQuoteFromForm,
} from "@/features/quotes/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { quoteFilterSchema, type QuoteFilterInput } from "@/features/quotes/schemas";
import { getOrCreatePaymentRequestForQuote } from "@/features/payment-requests/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader } from "@/components/ui";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuoteListRow } from "@/features/quotes/components/quote-list-row";
import { QuoteMobileCard } from "@/features/quotes/components/quote-mobile-card";
import { QuotePageToasts } from "@/features/quotes/components/quote-page-toasts";
import { QuoteFilters } from "@/features/quotes/components/quote-filters";
import { hasFilterValue } from "@/lib/filters";
import {
  quoteStatusLabels,
  quoteStatusBadgeVariant,
  workOrderStatusLabels,
  workOrderStatusBadgeVariant,
} from "@/features/quotes/lib/status";

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
  const [customers, quotes] = await Promise.all([listCustomers(), listQuotes(filters)]);

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

      <QuoteBuilderDialog
        customers={customers}
        createAction={createQuoteFromForm}
        createCustomerAction={createOrReuseCustomerForQuote}
        searchCustomersAction={searchCustomersForQuote}
      />

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Cotizaciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
            <QuoteFilters filters={filters} customers={customers} />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Orden de trabajo</TableHead>
                  <TableHead>Montos</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <QuoteListRow
                    key={quote.id}
                    quote={quote}
                    quoteStatusLabels={quoteStatusLabels}
                    quoteStatusBadgeVariant={quoteStatusBadgeVariant}
                    workOrderStatusLabels={workOrderStatusLabels}
                    workOrderStatusBadgeVariant={workOrderStatusBadgeVariant}
                    approveAction={approveQuoteAndCreateWorkOrderFromForm}
                    cancelAction={cancelDraftQuoteFromForm}
                    shareAction={shareQuoteFromForm}
                    authorizeAction={authorizeQuoteAction.bind(null, quote.id)}
                    paymentRequestAction={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
                    duplicateAction={duplicateQuoteFromForm}
                  />
                ))}
                {quotes.length === 0 ? (
                  <tr>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <p className="text-[var(--color-text-muted)]">
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
                    </TableCell>
                  </tr>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {quotes.map((quote) => (
              <QuoteMobileCard
                key={quote.id}
                quote={quote}
                quoteStatusLabels={quoteStatusLabels}
                quoteStatusBadgeVariant={quoteStatusBadgeVariant}
                workOrderStatusLabels={workOrderStatusLabels}
                workOrderStatusBadgeVariant={workOrderStatusBadgeVariant}
                approveAction={approveQuoteAndCreateWorkOrderFromForm}
                cancelAction={cancelDraftQuoteFromForm}
                shareAction={shareQuoteFromForm}
                authorizeAction={authorizeQuoteAction.bind(null, quote.id)}
                paymentRequestAction={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
                duplicateAction={duplicateQuoteFromForm}
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
