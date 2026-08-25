import type { Metadata } from "next";
import { FileCheck } from "lucide-react";
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
import { AdminPageHeader } from "@/components/admin-page-header";
import { WorkOrderCompletedList } from "@/features/work-orders/components/work-order-completed-list";
import { recordPaymentAction } from "@/features/payments/actions";
import { rollbackWorkOrderAction } from "@/features/work-orders/actions";
import { listActiveMasters } from "@/features/workers/queries";

export const metadata: Metadata = {
  title: "Notas de remisión",
};

export default async function NotasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseNotasParams(await searchParams);
  const [result, masters] = await Promise.all([listCompletedWorkOrders(filters), listActiveMasters()]);
  const { workOrders } = result;
  const quoteMap = new Map(workOrders.map((wo) => [wo.quote.id, wo.quote]));

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <AdminPageHeader
        icon={FileCheck}
        title="Notas"
      />

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
              recordPaymentActions={workOrders.map((wo) => ({
                workOrderId: wo.id,
                action: recordPaymentAction.bind(null, wo.quote.id),
              }))}
              rollbackAction={rollbackWorkOrderAction}
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
