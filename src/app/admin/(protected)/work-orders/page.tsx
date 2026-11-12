import type { ComponentProps } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { WorkerKind } from "@/generated/prisma/client";
import { listPaginatedActiveWorkOrders, listActiveWorkers, countActiveWorkOrders, countCompletedWorkOrders } from "@/features/work-orders/queries";
import { LinkTabs, PageHeader } from "@/components/ui";
import { WorkOrderFilters } from "@/features/work-orders/components/work-order-filters";
import { parseWorkOrderParams, workOrdersHref } from "@/features/work-orders/work-order-filter-model";
import { WorkOrderActiveList } from "@/features/work-orders/components/work-order-active-list";
import { listCustomers } from "@/features/customers/queries";
import { listQuotesByIds } from "@/features/quotes/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { duplicateQuoteFromForm, getOrCreateSharedQuoteAction, updateDraftQuoteFromWorkspace } from "@/features/quotes/actions";
import {
  assignWorkOrderAction,
  completeWorkOrderAction,
  createDirectWorkOrderFromWorkspace,
  rollbackWorkOrderAction,
} from "@/features/work-orders/actions";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";

export const metadata: Metadata = {
  title: "Trabajos en proceso",
};

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function WorkOrdersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let filters: ReturnType<typeof parseWorkOrderParams>;
  let rejectedRange: ComponentProps<typeof WorkOrderFilters>["rejectedRange"];
  try {
    filters = parseWorkOrderParams(params);
  } catch (cause) {
    if (!(cause instanceof RangeError)) throw cause;
    // Only build correction controls; never use these dateless filters to query.
    filters = parseWorkOrderParams({ ...params, dateFrom: undefined, dateTo: undefined, scheduledFrom: undefined, scheduledTo: undefined });
    rejectedRange = {
      kind: cause.message === "scheduledFrom must not be after scheduledTo." ? "scheduled" : "operational",
      dates: Object.fromEntries(["dateFrom", "dateTo", "scheduledFrom", "scheduledTo"].map((key) => [key, typeof params[key] === "string" ? params[key] : ""])),
    };
  }
  const [result, workers, customers, activeCount, completedCount] = await Promise.all([
    rejectedRange ? Promise.resolve({ workOrders: [], page: 1, hasNextPage: false }) : listPaginatedActiveWorkOrders(params),
    listActiveWorkers(),
    listCustomers(),
    countActiveWorkOrders(),
    countCompletedWorkOrders(),
  ]);

  const { workOrders, page, hasNextPage } = result;
  const hasFilters = workOrdersHref({ ...filters, page: 1 }) !== "/admin/work-orders";
  const masters = workers.filter((w) => w.role === "WORKER" && w.workerKind === WorkerKind.MASTER);

  // Load full quote data (with paidCents, activeSharedQuote, etc.) for the
  // work-order builder dialogs. We query only unique quote IDs returned by the filtered page.
  const activeQuoteIds = Array.from(new Set(workOrders.map((wo) => wo.quote.id)));
  const activeQuotes = activeQuoteIds.length > 0
    ? await listQuotesByIds(activeQuoteIds)
    : [];
  const quoteMap = new Map(activeQuotes.map((q) => [q.id, q]));

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <PageHeader
        title="Trabajos"
        subtitle={`${countLabel(activeCount, "activo", "activos")} · ${countLabel(completedCount, "completado", "completados")}`}
        primaryAction={
          <QuoteBuilderDialog
            customers={customers}
            createAction={createDirectWorkOrderFromWorkspace}
            createCustomerAction={createOrReuseCustomerForQuote}
            searchCustomersAction={searchCustomersForQuote}
            mode="direct-work-order"
            masters={masters}
            triggerLabel="Agregar trabajo"
          />
        }
      />
      <WorkOrderFilters
        key={JSON.stringify(params)}
        filters={filters}
        customers={customers}
        workers={masters}
        rejectedRange={rejectedRange}
        tabs={(
          <LinkTabs
            label="Secciones de trabajos"
            className="shrink-0"
            items={[
              { href: "/admin/work-orders", label: "Activos", count: activeCount, current: true },
              { href: "/admin/notas", label: "Completados", count: completedCount },
            ]}
          />
        )}
      />
      {!rejectedRange ? <section aria-labelledby="work-orders-heading" className="grid min-w-0 gap-4">
        <h2 id="work-orders-heading" className="sr-only">Órdenes activas</h2>
          {workOrders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {hasFilters ? "No hay trabajos que coincidan con los filtros." : "No hay trabajos en proceso."}
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {hasFilters ? <Link href="/admin/work-orders" className="text-[var(--color-primary)] hover:underline">Limpiar filtros</Link> : <>
                  Cuando generes una orden de trabajo aparecerá aquí, aun sin maestro asignado.{" "}
                  <Link href="/admin/quotes" className="text-[var(--color-primary)] hover:underline">Ver cotizaciones</Link>
                </>}
              </p>
            </div>
          ) : (
            <WorkOrderActiveList
              workOrders={workOrders}
              workers={workers}
              customers={customers}
              quoteMap={quoteMap}
              saveQuoteActions={workOrders.map((wo) => updateDraftQuoteFromWorkspace.bind(null, wo.quote.id))}
              searchCustomersAction={searchCustomersForQuote}
              duplicateQuoteAction={duplicateQuoteFromForm}
              shareAction={getOrCreateSharedQuoteAction}
              workOrderActions={{
                assign: assignWorkOrderAction,
                complete: completeWorkOrderAction,
                rollback: rollbackWorkOrderAction,
              }}
            />
          )}
      </section> : null}
      {!rejectedRange ? <nav aria-label="Paginación de trabajos" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {page > 1 ? <Link href={workOrdersHref({ ...filters, page: page - 1 })} className="inline-flex min-h-11 items-center">Anterior</Link> : <span className="text-[var(--color-text-muted)]">Anterior</span>}
        <span>Página {page} · {workOrders.length} trabajos en esta página</span>
        {hasNextPage ? <Link href={workOrdersHref({ ...filters, page: page + 1 })} className="inline-flex min-h-11 items-center">Siguiente</Link> : <span className="text-[var(--color-text-muted)]">Siguiente</span>}
      </nav> : null}

    </section>
  );
}
