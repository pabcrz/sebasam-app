import type { Metadata } from "next";
import Link from "next/link";
import { listCompletedWorkOrders } from "@/features/work-orders/queries";
import { notasHref, parseNotasParams } from "@/features/work-orders/notas-period";
import { NotasFilters } from "@/features/work-orders/components/notas-filters";
import {
  Card,
  Button,
  CardContent,
  CardHeader,
  CardTitle,
  MetricCardGroup,
  StatCard,
} from "@/components/ui";
import { WorkOrderCompletedList } from "@/features/work-orders/components/work-order-completed-list";
import { recordPaymentAction } from "@/features/payments/actions";
import {
  archiveCompletedNote,
  correctCompletedWorkQuoteFromWorkspace,
  getOrCreateSharedQuoteAction,
  revokeNoteCanonicalLinkAction,
} from "@/features/quotes/actions";
import { createDirectOperationFromWorkspace, rollbackWorkOrderAction } from "@/features/work-orders/actions";
import { listActiveMasters } from "@/features/workers/queries";
import { listCustomers } from "@/features/customers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { getCurrentProfile, isAdminRole } from "@/lib/auth/session";
import { formatCents } from "@/features/quotes/lib/format";
import { getNotePaymentHistory } from "@/features/payments/queries";

export const metadata: Metadata = {
  title: "Notas",
};

export default async function NotasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  let filters: ReturnType<typeof parseNotasParams>;
  let rejectedRange: { from: string; to: string } | undefined;
  try {
    filters = parseNotasParams(raw, undefined, { operationalFilters: true });
  } catch (cause) {
    if (!(cause instanceof RangeError)) throw cause;
    const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
    rejectedRange = { from: first(raw.dateFrom), to: first(raw.dateTo) };
    // Dateless state is only for correction rendering, never a query fallback.
    filters = parseNotasParams({ ...raw, dateFrom: undefined, dateTo: undefined }, undefined, { operationalFilters: true });
  }
  const [result, masters, customers, currentProfile] = await Promise.all([
    rejectedRange ? null : listCompletedWorkOrders(filters, { operationalFilters: true }),
    listActiveMasters(),
    listCustomers(),
    getCurrentProfile(),
  ]);
  const workOrders = result?.workOrders ?? [];
  const paymentHistories = result ? await getNotePaymentHistory(workOrders.map((workOrder) => workOrder.id)) : new Map();
  const quoteMap = new Map(workOrders.map((wo) => [wo.quote.id, wo.quote]));
  const noteReturnTo = notasHref(filters, { operationalFilters: true });
  const selectedCustomer = filters.customerId
    ? customers.find((c) => c.id === filters.customerId) ?? null
    : null;

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Notas
        </h1>
        <div className="hidden sm:block">
          <QuoteBuilderDialog
            customers={customers}
            createAction={createDirectOperationFromWorkspace}
            createCustomerAction={createOrReuseCustomerForQuote}
            searchCustomersAction={searchCustomersForQuote}
            mode="direct-note"
            masters={masters}
            triggerLabel="Nueva nota"
          />
        </div>
      </div>

      {result ? <>
      <p className="text-sm text-[var(--color-text-muted)]">Importes de las notas seleccionadas por periodo y filtros; no representan toda la cartera ni movimientos de cobro del periodo.</p>
      <MetricCardGroup columns={3}>
        <StatCard
          label="Pendiente de notas seleccionadas"
          value={formatCents(result.totals.totalPendingCents)}
          numericRole="currency"
          iconVariant="warning"
        />
        <StatCard
          label="Vencido de notas seleccionadas"
          value={formatCents(result.totals.totalOverdueCents)}
          numericRole="currency"
          iconVariant="danger"
        />
        <StatCard
          label="Cobrado acumulado de notas"
          value={formatCents(result.totals.totalPaidCents)}
          numericRole="currency"
          iconVariant="success"
        />
      </MetricCardGroup>
      </> : null}

      <NotasFilters
        key={JSON.stringify(raw)}
        operationalState={filters}
        rejectedRange={rejectedRange}
        mode={filters.mode}
        payment={filters.payment}
        assignee={filters.assignee}
        customerId={filters.customerId}
        overdue={filters.overdue}
        kind={filters.kind}
        anchor={filters.anchor}
        rangeLabel={filters.rangeLabel}
        isCurrentWeek={filters.isCurrentWeek}
        masters={masters}
        selectedCustomer={selectedCustomer}
        searchCustomersAction={searchCustomersForQuote}
      />

      {result ? <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Notas emitidas (WORK y SALE)</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {workOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="max-w-md text-sm text-[var(--color-text-muted)]">
                No hay notas WORK o SALE que coincidan con este periodo y los filtros seleccionados.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={notasHref({ mode: filters.mode, anchor: filters.anchor, payment: "all", assignee: "all", kind: "all" }, { operationalFilters: true })}>Limpiar filtros</Link>
              </Button>
            </div>
          ) : (
            <WorkOrderCompletedList
              workOrders={workOrders}
              quoteMap={quoteMap}
              customers={customers}
              searchCustomersAction={searchCustomersForQuote}
              recordPaymentActions={isAdminRole(currentProfile?.profile.role) ? workOrders.map((wo) => ({
                workOrderId: wo.id,
                action: recordPaymentAction.bind(null, wo.id),
              })) : []}
               correctWorkOrderActions={isAdminRole(currentProfile?.profile.role) ? workOrders.map((wo) => ({
                 workOrderId: wo.id,
                 action: correctCompletedWorkQuoteFromWorkspace.bind(null, wo.quote.id),
               })) : []}
               shareAction={getOrCreateSharedQuoteAction}
               archiveRevocationActions={isAdminRole(currentProfile?.profile.role) ? workOrders.map((wo) => ({
                 quoteId: wo.quote.id,
                 archive: archiveCompletedNote.bind(null, wo.quote.id),
                 revoke: revokeNoteCanonicalLinkAction.bind(null, wo.quote.id),
                  canRevoke: Boolean(wo.quote.hasRevocablePublicLink),
               })) : []}
               rollbackAction={rollbackWorkOrderAction}
               noteReturnTo={noteReturnTo}
              paymentHistories={workOrders.map((workOrder) => ({
                workOrderId: workOrder.id,
                ...(paymentHistories.get(workOrder.id) ?? { totalCents: Number(workOrder.quote.totalCents ?? 0), payments: [] }),
              }))}
             />
          )}
          <div className="mt-4 flex justify-between gap-3">
            {result.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={notasHref({ ...filters, page: result.page - 1 }, { operationalFilters: true })}>Página anterior</Link></Button> : <span />}
            {result.hasNextPage ? <Button asChild variant="outline" size="sm"><Link href={notasHref({ ...filters, page: result.page + 1 }, { operationalFilters: true })}>Página siguiente</Link></Button> : null}
          </div>
        </CardContent>
      </Card> : null}

      {/* Mobile Floating Action Button */}
      <div
        className="fixed right-4 z-40 sm:hidden"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <QuoteBuilderDialog
          customers={customers}
          createAction={createDirectOperationFromWorkspace}
          createCustomerAction={createOrReuseCustomerForQuote}
          searchCustomersAction={searchCustomersForQuote}
          mode="direct-note"
          masters={masters}
          triggerLabel="Nueva nota"
          triggerVariant="primary"
          triggerSize="sm"
          triggerClassName="h-11 px-4 rounded-2xl shadow-xl text-sm font-semibold flex items-center gap-1.5 border border-white/20"
        />
      </div>
    </section>
  );
}
