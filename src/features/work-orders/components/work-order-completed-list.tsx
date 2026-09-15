"use client";

import * as React from "react";
import type { listCompletedWorkOrders } from "@/features/work-orders/queries";
import {
  Badge,
  OperationalActionsMenu,
  OperationalCard,
  OperationalCardActions,
  OperationalCardLayout,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { CorrectPaymentResult } from "@/features/payments/domain";
import { derivePaymentState } from "@/features/work-orders/payment-state";
import { CashPaymentDialog, PaymentBalanceSummary } from "@/features/payments/components/cash-payment-dialog";
import { PaymentCorrectionDialog } from "@/features/payments/components/payment-correction-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";
import { resolveDocumentFolio, resolveAntecedentQuoteFolio } from "@/features/quotes/lib/document-resolver";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { NoteArchiveRevocationAction } from "@/features/quotes/components/note-archive-revocation-actions";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import { NotePaymentHistory } from "@/features/payments/components/note-payment-history";
import type { NotePaymentHistoryItem } from "@/features/payments/lib/payment-register";
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
  paymentHistories?: Array<{ workOrderId: string; totalCents: number; payments: NotePaymentHistoryItem[] }>;
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
  paymentHistories = [],
}: WorkOrderCompletedListProps) {
  const paymentActionMap = new Map(recordPaymentActions.map((p) => [p.workOrderId, p.action]));
  const correctionActionMap = new Map(correctionActions.map((p) => [p.workOrderId, p.action]));
  const correctWorkOrderActionMap = new Map(correctWorkOrderActions.map((c) => [c.workOrderId, c.action]));
  const archiveRevocationActionMap = new Map(archiveRevocationActions.map((action) => [action.quoteId, action]));
  const paymentHistoryMap = new Map(paymentHistories.map((history) => [history.workOrderId, history]));
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
        const totalCents = wo.quote.effectiveTotalCents ?? Number(wo.quote.totalCents);
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
        const remainingCents = wo.quote.remainingCents ?? totalCents;
        const isPaid = remainingCents <= 0;
        const hasPaymentAction = Boolean(paymentAction && !isPaid);

        const primaryAction = hasPaymentAction ? (
          <CashPaymentDialog
            action={paymentAction!}
            quoteNumber={wo.quote.number}
            totalCents={totalCents}
            paidCents={wo.quote.paidCents ?? 0}
            remainingCents={remainingCents}
            documentTitle={wo.quote.title}
            documentFolio={noteFolio}
            receiptEnabled
            allowedMethods={["CASH", "TRANSFER"]}
            triggerOnly
            triggerVariant="primary"
            triggerClassName="w-full"
          />
        ) : (
          <ShareQuoteButton
            action={shareAction.bind(null, wo.quote.id)}
            quoteNumber={wo.quote.number}
            variant="primary"
            className="w-full"
          />
        );

        const frequentActions = (
          <>
            <PrintActionButton
              url={`/admin/notas/${wo.id}/print?returnTo=${encodeURIComponent(noteReturnTo)}`}
              variant="outline"
              size="sm"
              className="h-11 w-full min-w-0 justify-center gap-0 px-0 sm:h-9 sm:w-full sm:min-w-0 sm:gap-0 sm:px-0"
              title={`Imprimir nota de remisión ${wo.number}`}
              aria-label={`Imprimir nota de remisión ${wo.number}`}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Imprimir</span>
            </PrintActionButton>
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
                triggerClassName="h-11 w-full min-w-0 justify-center gap-0 px-0 sm:h-9 sm:w-full sm:min-w-0 sm:gap-0 sm:px-0"
                triggerIconOnlyMobile
              />
            ) : null}
            {hasPaymentAction ? (
              <ShareQuoteButton
                action={shareAction.bind(null, wo.quote.id)}
                quoteNumber={wo.quote.number}
                variant="outline"
                className="h-11 w-full min-w-0 justify-center gap-0 px-0 sm:h-9 sm:w-full sm:min-w-0 sm:gap-0 sm:px-0"
                actionLabelClassName="sr-only sm:not-sr-only"
              />
            ) : null}
          </>
        );

        const hasOverflow = Boolean(
          (archiveRevocationAction && wo.quote.status !== "ARCHIVED") ||
            archiveRevocationAction?.canRevoke ||
            (correctionAction && wo.quote.activePaymentId && wo.quote.activePaymentAmountCents != null) ||
            rollbackAction,
        );

        const overflowAction = hasOverflow ? (
          <OperationalActionsMenu
            title="Acciones de nota"
            description={`Opciones para la nota ${noteFolio}.`}
            triggerAriaLabel={`Más acciones de nota ${noteFolio}`}
            triggerTitle={`Más acciones de nota ${noteFolio}`}
            triggerClassName="h-11 w-11 shrink-0 justify-center gap-0 px-0 sm:h-9 sm:w-9 sm:px-0"
            triggerIconOnly
            destructive={
              rollbackAction ? (
                <WorkOrderOperationsDialog
                  quoteNumber={wo.quote.number}
                  quoteStatus="APPROVED"
                  workOrder={wo}
                  actions={{ rollback: rollbackAction }}
                  triggerVariant="danger"
                  triggerIconOnlyMobile={false}
                />
              ) : undefined
            }
          >
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
          </OperationalActionsMenu>
        ) : null;

        return (
          <OperationalCard
            key={wo.id}
            onOpen={quoteMap?.has(wo.quote.id) ? () => setSelectedQuoteId(wo.quote.id) : undefined}
            openLabel={`Ver detalle de cotización ${wo.quote.number}`}
            actions={
              <OperationalCardActions
                primary={primaryAction}
                frequent={frequentActions}
                overflow={overflowAction}
              />
            }
            body={
              <OperationalCardLayout
                header={
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-main)]">{noteFolio}</span>
                        <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">
                          ({wo.number})
                        </span>
                        <Badge variant={paymentState.variant} className="w-fit">
                          {paymentState.label}
                          {paymentState.label === "Pago parcial" || paymentState.label === "Vencida"
                            ? ` · Saldo ${formatCents(paymentState.balanceCents!)}`
                            : ""}
                        </Badge>
                        {wo.quote.isLocked ? <Badge variant="warning">Bloqueado</Badge> : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-2xl font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                        {formatCents(totalCents)}
                      </p>
                    </div>
                  </div>
                }
                identity={
                  <div>
                    <p className="font-semibold text-[var(--color-text-main)]">
                      {resolveCustomerDisplayIdentity(wo.quote).displayName}
                    </p>
                    {resolveCustomerDisplayIdentity(wo.quote).operatorName ? (
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        {resolveCustomerDisplayIdentity(wo.quote).operatorRole}:{" "}
                        {resolveCustomerDisplayIdentity(wo.quote).operatorName}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--color-text-muted)]">{formatVehicle(wo)}</p>
                  </div>
                }
                context={
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--color-text-muted)]">
                      <span className="font-medium">Cot. {antecedentQuoteFolio}</span>
                      <span>·</span>
                      <span>
                        {wo.isSpecial
                          ? "Taller"
                          : wo.assignments.find((a) => a.worker.workerKind === "MASTER")?.worker.displayName ??
                            "Sin maestro"}
                      </span>
                    </div>
                    <PaymentBalanceSummary
                      totalCents={totalCents}
                      paidCents={wo.quote.paidCents ?? 0}
                      remainingCents={remainingCents}
                    />
                    <NotePaymentHistory
                      title={wo.quote.title}
                      folio={noteFolio}
                      totalCents={paymentHistoryMap.get(wo.id)?.totalCents ?? totalCents}
                      payments={paymentHistoryMap.get(wo.id)?.payments ?? []}
                    />
                  </div>
                }
                dates={
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <p>Finalizada {formatDate(wo.completedAt)}</p>
                    {dueDate ? <p>Vence {formatDate(dueDate)}</p> : null}
                  </div>
                }
              />
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
