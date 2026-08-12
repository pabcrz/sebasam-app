import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { listActiveWorkOrders, listActiveWorkers } from "@/features/work-orders/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { WorkOrderActiveList } from "@/features/work-orders/components/work-order-active-list";
import { listCustomers } from "@/features/customers/queries";
import { listQuotes } from "@/features/quotes/queries";
import { searchCustomersForQuote } from "@/features/customers/actions";
import { duplicateQuoteFromForm, shareQuoteFromForm, updateDraftQuoteFromWorkspace } from "@/features/quotes/actions";
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardDescription>Órdenes de trabajo activas</CardDescription>
              <CardTitle as="h1">Trabajos en proceso</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Órdenes con maestro asignado. Desde aquí podés editar conceptos y finalizar el trabajo.
          </p>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">
            Trabajos activos{" "}
            {workOrders.length > 0 ? (
              <span className="ml-1 rounded-full bg-[var(--color-blue-tint)] px-2 py-0.5 text-sm font-medium text-[var(--color-primary)]">
                {workOrders.length}
              </span>
            ) : null}
          </CardTitle>
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
              shareQuoteAction={shareQuoteFromForm}
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
