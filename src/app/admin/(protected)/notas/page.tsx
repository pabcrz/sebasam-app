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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { WorkOrderCompletedList } from "@/features/work-orders/components/work-order-completed-list";
import { recordPaymentAction } from "@/features/payments/actions";
import { rollbackWorkOrderAction } from "@/features/work-orders/actions";

export const metadata: Metadata = {
  title: "Notas de remisión",
};

export default async function NotasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseNotasParams(await searchParams);
  const result = await listCompletedWorkOrders(filters);
  const { workOrders } = result;
  const quoteMap = new Map(workOrders.map((wo) => [wo.quote.id, wo.quote]));

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
              <FileCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardDescription>Trabajos finalizados</CardDescription>
              <CardTitle as="h1">Notas de remisión</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Trabajos completados del periodo. Revisa saldos, registra cobros e imprime cada nota de remisión.
          </p>
        </CardContent>
      </Card>

      <NotasFilters mode={filters.mode} payment={filters.payment} anchor={filters.anchor} rangeLabel={filters.rangeLabel} isCurrentWeek={filters.isCurrentWeek} />

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
