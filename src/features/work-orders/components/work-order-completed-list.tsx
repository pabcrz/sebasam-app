"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import Link from "next/link";
import type { listCompletedWorkOrders } from "@/features/work-orders/queries";
import { Badge, Button, OperationalActionRow, OperationalCard } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { derivePaymentState } from "@/features/work-orders/payment-state";
import { CashPaymentDialog } from "@/features/payments/components/cash-payment-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";

type WorkOrderItem = Awaited<ReturnType<typeof listCompletedWorkOrders>>["workOrders"][number];

type PaymentResult = {
  payment: { amountCents: number };
  paidCents: number;
  remainingCents: number;
};

type WorkOrderPaymentAction = {
  workOrderId: string;
  action: (amount: string, operationKey: string, method: string) => Promise<PaymentResult>;
};

interface WorkOrderCompletedListProps {
  workOrders: WorkOrderItem[];
  quoteMap?: Map<string, WorkOrderItem["quote"]>;
  recordPaymentActions?: WorkOrderPaymentAction[];
  rollbackAction?: WorkOrderActions["rollback"];
  noteReturnTo?: string;
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(date));
}

function formatVehicle(wo: WorkOrderItem) {
  const v = wo.quote.vehicle;
  if (!v) return "Sin vehículo";
  return [v.brand, v.model, v.year, v.plate ? `· ${v.plate}` : null].filter(Boolean).join(" ");
}

export function WorkOrderCompletedList({ workOrders, quoteMap, recordPaymentActions = [], rollbackAction, noteReturnTo = "/admin/notas" }: WorkOrderCompletedListProps) {
  const paymentActionMap = new Map(recordPaymentActions.map((p) => [p.workOrderId, p.action]));
  const [selectedQuoteId, setSelectedQuoteId] = React.useState<string | null>(null);

  const selectedQuote = React.useMemo(() => {
    if (!selectedQuoteId || !quoteMap) return null;
    return quoteMap.get(selectedQuoteId) ?? null;
  }, [selectedQuoteId, quoteMap]);

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
      {workOrders.map((wo) => {
        const paymentAction = paymentActionMap.get(wo.id);
        const totalCents = Number(wo.quote.totalCents);
        const paymentState = derivePaymentState({
          completedAt: wo.completedAt,
          paidCents: wo.quote.paidCents ?? 0,
          remainingCents: wo.quote.remainingCents ?? totalCents,
        });

        return (
          <OperationalCard
            key={wo.id}
            onOpen={quoteMap?.has(wo.quote.id) ? () => setSelectedQuoteId(wo.quote.id) : undefined}
            openLabel={`Ver detalle de cotización ${wo.quote.number}`}
            actionsClassName="grid gap-3"
            actions={
              <>
                {paymentAction ? (
                  <CashPaymentDialog
                    action={paymentAction}
                    quoteNumber={wo.quote.number}
                    totalCents={totalCents}
                    paidCents={wo.quote.paidCents ?? 0}
                    remainingCents={wo.quote.remainingCents ?? totalCents}
                  />
                ) : null}
                <OperationalActionRow>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="sm"
                    data-mobile-target="44"
                    className="h-10 min-h-11 min-w-11 w-10 px-0 sm:h-9 sm:w-auto sm:px-3"
                    title={`Imprimir nota de remisión ${wo.number}`}
                    aria-label={`Imprimir nota de remisión ${wo.number}`}
                  >
                    <Link href={`/admin/notas/${wo.id}/print?returnTo=${encodeURIComponent(noteReturnTo)}`}>
                      <Printer className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only sm:not-sr-only">Imprimir nota</span>
                    </Link>
                  </Button>
                  <WorkOrderOperationsDialog quoteNumber={wo.quote.number} quoteStatus="APPROVED" workOrder={wo} actions={{ rollback: rollbackAction }} triggerIconOnlyMobile noteReturnTo={noteReturnTo} />
                </OperationalActionRow>
              </>
            }
            body={
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">{wo.number}</span>
                      <Badge variant={paymentState.variant} className="w-fit">
                        {paymentState.label}{paymentState.label === "Pago parcial" || paymentState.label === "Cobro urgente" ? ` · Saldo ${formatCents(paymentState.balanceCents!)}` : ""}
                      </Badge>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--color-text-main)]">{wo.quote.customer?.name ?? "Sin cliente"}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{formatVehicle(wo)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                      {formatCents(totalCents)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Finalizada {formatDate(wo.completedAt)}
                    </p>
                  </div>
                </div>

                <div className="mb-3 text-sm text-[var(--color-text-muted)]">
                  <span className="font-medium">Cot. {wo.quote.number}</span>
                  {" · "}
                  {wo.isSpecial
                    ? "Taller"
                    : wo.assignments.find((a) => a.worker.workerKind === "MASTER")?.worker.displayName ?? "Sin maestro"}
                </div>
              </>
            }
          />
        );
      })}
    </div>

    {selectedQuote && (
      <QuotePreviewDialog
        quote={selectedQuote}
        noteReturnTo={noteReturnTo}
        open={selectedQuoteId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedQuoteId(null);
        }}
      />
    )}
  </>
  );
}
