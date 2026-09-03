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
import { recordPaymentAction } from "@/features/payments/actions";
import { rollbackWorkOrderAction } from "@/features/work-orders/actions";
import { listActiveMasters } from "@/features/workers/queries";
import { getCurrentProfile, isAdminRole } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Notas",
};

export default async function NotasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseNotasParams(await searchParams);
  const [result, masters, currentProfile] = await Promise.all([listCompletedWorkOrders(filters), listActiveMasters(), getCurrentProfile()]);
  const { workOrders } = result;
  const quoteMap = new Map(workOrders.map((wo) => [wo.quote.id, wo.quote]));
  const noteReturnTo = notasHref(filters);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Notas
        </h1>
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
    </section>
  );
}
