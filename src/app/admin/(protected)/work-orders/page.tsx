import type { Metadata } from "next";
import Link from "next/link";
import { listActiveWorkOrders, listActiveWorkers } from "@/features/work-orders/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { WorkOrderActiveList } from "@/features/work-orders/components/work-order-active-list";
import { listCustomers } from "@/features/customers/queries";
import { listQuotes } from "@/features/quotes/queries";
import { searchCustomersForQuote } from "@/features/customers/actions";
import { duplicateQuoteFromForm, updateDraftQuoteFromWorkspace } from "@/features/quotes/actions";
import { assignWorkOrderAction, completeWorkOrderAction, rollbackWorkOrderAction } from "@/features/work-orders/actions";

export const metadata: Metadata = {
  title: "Trabajos en proceso",
};

export default async function WorkOrdersPage() {
  const [workOrders, workers, customers] = await Promise.all([
    listActiveWorkOrders(),
    listActiveWorkers(),
    listCustomers(),
  ]);

  // Load full quote data (with paidCents, activeSharedQuote, etc.) for the
  // work-order builder dialogs. We filter by the quote IDs that have active work orders.
  const activeQuoteIds = new Set(workOrders.map((wo) => wo.quote.id));
  const allQuotes = activeQuoteIds.size > 0
    ? await listQuotes()
    : [];
  const activeQuotes = allQuotes.filter((q) => activeQuoteIds.has(q.id));
  const quoteMap = new Map(activeQuotes.map((q) => [q.id, q]));

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">
          Trabajos en proceso
        </h1>
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Órdenes activas</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {workOrders.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                No hay trabajos en proceso.
              </p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Cuando una cotización aprobada reciba un maestro, aparecerá aquí.{" "}
                <Link href="/admin/quotes" className="text-[var(--color-primary)] hover:underline">
                  Ver cotizaciones
                </Link>
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
              workOrderActions={{
                assign: assignWorkOrderAction,
                complete: completeWorkOrderAction,
                rollback: rollbackWorkOrderAction,
              }}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
