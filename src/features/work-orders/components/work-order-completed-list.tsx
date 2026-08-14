"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import type { listCompletedWorkOrders } from "@/features/work-orders/queries";
import { Badge, Button, OperationalCard } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
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

export function WorkOrderCompletedList({ workOrders, quoteMap, recordPaymentActions = [], rollbackAction }: WorkOrderCompletedListProps) {
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

        return (
          <OperationalCard
            key={wo.id}
            onOpen={quoteMap?.has(wo.quote.id) ? () => setSelectedQuoteId(wo.quote.id) : undefined}
            openLabel={`Ver detalle de cotización ${wo.quote.number}`}
            footerClassName="grid gap-3"
            footer={
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:w-9 sm:flex-none sm:px-0"
                    title={`Imprimir nota de remisión ${wo.number}`}
                    aria-label={`Imprimir nota de remisión ${wo.number}`}
                    onClick={() => window.open(`/admin/notas/${wo.id}/print`, "_blank")}
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    <span className="sm:sr-only">Imprimir nota</span>
                  </Button>
                  <WorkOrderOperationsDialog quoteNumber={wo.quote.number} quoteStatus="APPROVED" workOrder={wo} actions={{ rollback: rollbackAction }} triggerIconOnlyDesktop />
                </div>
              </>
            }
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">{wo.number}</span>
                  <Badge variant="success" className="w-fit">Completada</Badge>
                </div>
                <p className="mt-1 font-semibold text-[var(--color-text-main)]">{wo.quote.customer.name}</p>
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
          </OperationalCard>
        );
      })}
    </div>

    {selectedQuote && (
      <QuotePreviewDialog
        quote={selectedQuote}
        open={selectedQuoteId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedQuoteId(null);
        }}
      />
    )}
  </>
  );
}
