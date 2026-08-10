import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getWorkOrderById } from "@/features/work-orders/queries";
import { listActiveWorkers } from "@/features/workers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { updateDraftQuoteFromWorkspace } from "@/features/quotes/actions";
import { listCustomers } from "@/features/customers/queries";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { WorkOrderOperationsDialog } from "@/features/work-orders/components/work-order-operations-dialog";
import { createAndAssignWorkOrderAction, completeWorkOrderAction } from "@/features/work-orders/actions";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { formatCents, formatDate, formatVehicle } from "@/features/quotes/lib/format";
import { isQuoteEditable } from "@/features/quotes/lib/editability";

export const metadata: Metadata = {
  title: "Detalle de Trabajo",
};

type WorkOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrderDetailPage({ params }: WorkOrderDetailPageProps) {
  const { id } = await params;
  const [workOrder, workers, customers] = await Promise.all([
    getWorkOrderById(id),
    listActiveWorkers(),
    listCustomers(),
  ]);

  if (!workOrder) {
    notFound();
  }

  const { quote } = workOrder;
  const editable = isQuoteEditable({ ...quote, workOrder: { status: workOrder.status } });
  const master = workOrder.assignments.find((a) => a.worker.workerKind === "MASTER");
  const helpers = workOrder.assignments.filter((a) => a.worker.workerKind === "HELPER");

  const dialogActions = {
    assign: createAndAssignWorkOrderAction.bind(null, quote.id),
    complete: completeWorkOrderAction,
  };

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div>
        <Link
          href="/admin/work-orders"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Trabajos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardDescription>Orden de Trabajo {workOrder.number}</CardDescription>
                <CardTitle as="h1">{quote.customer.name}</CardTitle>
              </div>
            </div>
            <Badge
              variant={workOrder.status === "COMPLETED" ? "success" : "info"}
              className="w-fit"
            >
              {workOrder.status === "COMPLETED" ? "Completada" : "En proceso"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4 text-sm">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Vehículo</p>
              <p className="mt-1 font-semibold text-[var(--color-text-main)]">
                {quote.vehicle ? formatVehicle(quote.vehicle) : "Sin vehículo"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Cotización</p>
              <p className="mt-1 font-semibold text-[var(--color-text-main)]">{quote.number}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Personal asignado</p>
              <p className="mt-1 text-[var(--color-text-main)]">
                {workOrder.isSpecial ? (
                  <span>Trabajo especial: {workOrder.specialAssigneeName ?? "Sin nombre"}</span>
                ) : master ? (
                  <span>Maestro: {master.worker.displayName}</span>
                ) : (
                  <span>Sin asignar</span>
                )}
              </p>
              {helpers.length > 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Ayudantes: {helpers.map((h) => h.worker.displayName).join(", ")}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Total actual</p>
              <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                {formatCents(Number(quote.totalCents))}
              </p>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] pt-4">
            <div>
              {editable ? (
                <QuoteBuilderDialog
                  customers={customers}
                  quote={quote as never}
                  quoteNumber={quote.number}
                  saveAction={updateDraftQuoteFromWorkspace.bind(null, quote.id)}
                  searchCustomersAction={searchCustomersForQuote}
                />
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Los conceptos están congelados porque la orden fue finalizada.
                </p>
              )}
            </div>
            <div className="w-full sm:w-auto">
              <WorkOrderOperationsDialog
                quoteNumber={quote.number}
                quoteStatus={quote.status}
                workOrder={workOrder}
                workers={workers}
                actions={dialogActions}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
