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
} from "@/components/ui";
import { WorkOrderCompletedList } from "@/features/work-orders/components/work-order-completed-list";
import { correctPaymentAction, recordPaymentAction } from "@/features/payments/actions";
import { createDirectNoteFromWorkspace, rollbackWorkOrderAction } from "@/features/work-orders/actions";
import { listActiveMasters } from "@/features/workers/queries";
import { listCustomers } from "@/features/customers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { getCurrentProfile, isAdminRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Notas",
};

export default async function NotasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseNotasParams(await searchParams);
  const [result, masters, customers, currentProfile] = await Promise.all([
    listCompletedWorkOrders(filters),
    listActiveMasters(),
    listCustomers(),
    getCurrentProfile(),
  ]);
  const { workOrders } = result;
  const quoteMap = new Map(workOrders.map((wo) => [wo.quote.id, wo.quote]));
  const noteReturnTo = notasHref(filters);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Notas
        </h1>
        <div className="hidden sm:block">
          <QuoteBuilderDialog
            customers={customers}
            createAction={createDirectNoteFromWorkspace}
            createCustomerAction={createOrReuseCustomerForQuote}
            searchCustomersAction={searchCustomersForQuote}
            mode="direct-note"
            masters={masters}
            triggerLabel="Nueva nota"
          />
        </div>
      </div>
      <NotasFilters mode={filters.mode} payment={filters.payment} assignee={filters.assignee} anchor={filters.anchor} rangeLabel={filters.rangeLabel} isCurrentWeek={filters.isCurrentWeek} masters={masters} />

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Trabajos completados</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {workOrders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No hay trabajos que coincidan con este periodo y estado de pago.
              </p>
            </div>
          ) : (
            <WorkOrderCompletedList
              workOrders={workOrders}
              quoteMap={quoteMap}
              recordPaymentActions={isAdminRole(currentProfile?.profile.role) ? workOrders.map((wo) => ({
                workOrderId: wo.id,
                action: recordPaymentAction.bind(null, wo.id),
              })) : []}
              correctionActions={isAdminRole(currentProfile?.profile.role) ? workOrders.flatMap((wo) =>
                wo.quote.activePaymentId ? [{
                  workOrderId: wo.id,
                  action: correctPaymentAction.bind(null, wo.quote.activePaymentId),
                }] : []
              ) : []}
              rollbackAction={rollbackWorkOrderAction}
              noteReturnTo={noteReturnTo}
            />
          )}
          <div className="mt-4 flex justify-between gap-3">
            {result.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={notasHref({ ...filters, page: result.page - 1 })}>Página anterior</Link></Button> : <span />}
            {result.hasNextPage ? <Button asChild variant="outline" size="sm"><Link href={notasHref({ ...filters, page: result.page + 1 })}>Página siguiente</Link></Button> : null}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Floating Action Button */}
      <div
        className="fixed right-4 z-40 sm:hidden"
        style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <QuoteBuilderDialog
          customers={customers}
          createAction={createDirectNoteFromWorkspace}
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
