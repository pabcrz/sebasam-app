import type { Metadata } from "next";
import Link from "next/link";
import { listCompletedWorkOrders } from "@/features/work-orders/queries";
import { notasHref, parseNotasParams } from "@/features/work-orders/notas-period";
import { NotasFilters } from "@/features/work-orders/components/notas-filters";
import {
  Button,
  PageHeader,
  StatTile,
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
      <PageHeader
        title="Notas"
        primaryAction={
          <QuoteBuilderDialog
            customers={customers}
            createAction={createDirectOperationFromWorkspace}
            createCustomerAction={createOrReuseCustomerForQuote}
            searchCustomersAction={searchCustomersForQuote}
            mode="direct-note"
            masters={masters}
            triggerLabel="Nueva nota"
          />
        }
      />

      {result ? <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Por cobrar"
          value={formatCents(result.totals.totalPendingCents)}
          tone="warning"
          info="Saldo de las notas del periodo y filtros elegidos; no es toda la cartera ni cobro del periodo."
        />
        <StatTile
          label="Vencido"
          value={formatCents(result.totals.totalOverdueCents)}
          tone="danger"
          info="Saldo de las notas seleccionadas cuya fecha de vencimiento ya pasó."
        />
        <StatTile
          label="Cobrado"
          value={formatCents(result.totals.totalPaidCents)}
          tone="success"
          info="Pagos acumulados de las notas seleccionadas; no son cobros del periodo."
        />
      </div> : null}

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

      {result ? <section aria-labelledby="notes-heading" className="grid min-w-0 gap-4">
        <h2 id="notes-heading" className="sr-only">Notas emitidas (WORK y SALE)</h2>
          {workOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="max-w-md text-sm text-[var(--color-text-muted)]">
                No hay notas en este periodo con estos filtros.
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
      </section> : null}

    </section>
  );
}
