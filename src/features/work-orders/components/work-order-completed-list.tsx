"use client";

import * as React from "react";
import type { listCompletedWorkOrders } from "@/features/work-orders/queries";
import { Badge, OperationalActionRow, OperationalCard } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { CorrectPaymentResult } from "@/features/payments/domain";
import { derivePaymentState } from "@/features/work-orders/payment-state";
import { CashPaymentDialog } from "@/features/payments/components/cash-payment-dialog";
import { PaymentCorrectionDialog } from "@/features/payments/components/payment-correction-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";
import { resolveDocumentFolio, resolveAntecedentQuoteFolio } from "@/features/quotes/lib/document-resolver";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { NoteArchiveRevocationAction } from "@/features/quotes/components/note-archive-revocation-actions";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import { Printer } from "lucide-react";
import type { CustomerOption } from "@/features/quotes/components/quote-builder-contracts";
import type { QuoteFormActionState } from "@/features/quotes/actions";

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

type WorkOrderCorrectionAction = {
  workOrderId: string;
  action: (
    paymentId: string,
    amount: string,
    method: string,
    reason: string,
    operationKey: string,
  ) => Promise<CorrectPaymentResult>;
};

type WorkOrderCommercialCorrectionAction = {
  workOrderId: string;
  action: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
};

type NoteArchiveRevocationAction = {
  quoteId: string;
  archive: (reason: string) => Promise<void>;
  revoke: (reason: string) => Promise<{ success: true } | { success: false; error: string }>;
  canRevoke: boolean;
};

interface WorkOrderCompletedListProps {
  workOrders: WorkOrderItem[];
  quoteMap?: Map<string, WorkOrderItem["quote"]>;
  customers?: CustomerOption[];
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
  recordPaymentActions?: WorkOrderPaymentAction[];
  correctionActions?: WorkOrderCorrectionAction[];
  correctWorkOrderActions?: WorkOrderCommercialCorrectionAction[];
  shareAction: (quoteId: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  archiveRevocationActions?: NoteArchiveRevocationAction[];
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

export function WorkOrderCompletedList({
  workOrders,
  quoteMap,
  customers = [],
  searchCustomersAction,
  recordPaymentActions = [],
  correctionActions = [],
  correctWorkOrderActions = [],
  shareAction,
  archiveRevocationActions = [],
  rollbackAction,
  noteReturnTo = "/admin/notas",
}: WorkOrderCompletedListProps) {
  const paymentActionMap = new Map(recordPaymentActions.map((p) => [p.workOrderId, p.action]));
  const correctionActionMap = new Map(correctionActions.map((p) => [p.workOrderId, p.action]));
  const correctWorkOrderActionMap = new Map(correctWorkOrderActions.map((c) => [c.workOrderId, c.action]));
  const archiveRevocationActionMap = new Map(archiveRevocationActions.map((action) => [action.quoteId, action]));
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
        const correctionAction = correctionActionMap.get(wo.id);
        const correctWorkOrderAction = correctWorkOrderActionMap.get(wo.id);
        const archiveRevocationAction = archiveRevocationActionMap.get(wo.quote.id);
        const totalCents = Number(wo.quote.totalCents);
        const dueDate = wo.paymentDueDate ?? wo.quote.paymentDueDate ?? null;
        const noteFolio = resolveDocumentFolio(wo);
        const antecedentQuoteFolio = resolveAntecedentQuoteFolio(wo.quote);
        const paymentState = derivePaymentState({
          completedAt: wo.completedAt,
          paymentDueDate: dueDate,
          paidCents: wo.quote.paidCents ?? 0,
          remainingCents: wo.quote.remainingCents ?? totalCents,
        });
        const quoteDetail = quoteMap?.get(wo.quote.id) ?? wo.quote;
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
                  <ShareQuoteButton action={shareAction.bind(null, wo.quote.id)} quoteNumber={wo.quote.number} actionLabelClassName="sr-only sm:not-sr-only" />
                  <PrintActionButton
                    url={`/admin/notas/${wo.id}/print?returnTo=${encodeURIComponent(noteReturnTo)}`}
                    variant="outline"
                    size="sm"
                    className="min-h-11 min-w-11 w-9 px-0 sm:w-auto sm:px-3"
                    title={`Imprimir nota de remisión ${wo.number}`}
                    aria-label={`Imprimir nota de remisión ${wo.number}`}
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Imprimir Nota de Remisión</span>
                  </PrintActionButton>
                  {archiveRevocationAction && wo.quote.status !== "ARCHIVED" ? (
                    <NoteArchiveRevocationAction
                      quoteNumber={wo.quote.number}
                      mode="archive"
                      action={archiveRevocationAction.archive}
                    />
                  ) : null}
                  {archiveRevocationAction?.canRevoke ? (
                    <NoteArchiveRevocationAction
                      quoteNumber={wo.quote.number}
                      mode="revoke"
                      action={archiveRevocationAction.revoke}
                    />
                  ) : null}
                  <WorkOrderOperationsDialog quoteNumber={wo.quote.number} quoteStatus="APPROVED" workOrder={wo} actions={{ rollback: rollbackAction }} triggerIconOnlyMobile />
                  {correctWorkOrderAction ? (
                    <QuoteBuilderDialog
                      customers={customers}
                      quote={quoteDetail as never}
                      quoteNumber={wo.quote.number}
                      saveAction={correctWorkOrderAction}
                      searchCustomersAction={searchCustomersAction}
                      triggerLabel="Corregir nota"
                      triggerAriaLabel="Corregir nota"
                      triggerVariant="outline"
                      triggerSize="sm"
                      triggerIconOnlyMobile
                    />
                  ) : null}
                  {correctionAction && wo.quote.activePaymentId && wo.quote.activePaymentAmountCents != null ? (
                    <PaymentCorrectionDialog
                      paymentId={wo.quote.activePaymentId}
                      originalAmountCents={wo.quote.activePaymentAmountCents}
                      originalMethod={wo.quote.activePaymentMethod ?? "CASH"}
                      reference={wo.quote.number}
                      paymentDate={wo.completedAt}
                      quoteNumber={wo.quote.number}
                      action={correctionAction}
                    />
                  ) : null}
                </OperationalActionRow>
              </>
            }
            body={
              <>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-main)]">{noteFolio}</span>
                      <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">({wo.number})</span>
                      <Badge variant={paymentState.variant} className="w-fit">
                        {paymentState.label}{paymentState.label === "Pago parcial" || paymentState.label === "Vencida" ? ` · Saldo ${formatCents(paymentState.balanceCents!)}` : ""}
                      </Badge>
                      {wo.quote.isLocked ? (
                        <Badge variant="warning">Bloqueado</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 font-semibold text-[var(--color-text-main)]">
                      {resolveCustomerDisplayIdentity(wo.quote).displayName}
                    </p>
                    {resolveCustomerDisplayIdentity(wo.quote).operatorName ? (
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        {resolveCustomerDisplayIdentity(wo.quote).operatorRole}: {resolveCustomerDisplayIdentity(wo.quote).operatorName}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--color-text-muted)]">{formatVehicle(wo)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                      {formatCents(totalCents)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Finalizada {formatDate(wo.completedAt)}
                    </p>
                    {dueDate ? (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Vence {formatDate(dueDate)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mb-3 text-sm text-[var(--color-text-muted)]">
                  <span className="font-medium">Cot. {antecedentQuoteFolio}</span>
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
