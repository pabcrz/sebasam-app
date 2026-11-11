"use client";

import * as React from "react";
import type { CompletedNoteItem } from "@/features/work-orders/queries";
import {
  Badge,
  Button,
  EntityCard,
  OperationalActionsMenu,
} from "@/components/ui";
import { formatUnitIdentity } from "@/lib/unit-identity";
import { formatCents } from "@/features/quotes/lib/format";
import { derivePaymentState } from "@/features/work-orders/payment-state";
import { NotaDetailDialog } from "./nota-detail-dialog";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshot-display";
import { resolveDocumentFolio, resolveAntecedentQuoteFolio } from "@/features/quotes/lib/document-resolver";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { NoteArchiveRevocationAction } from "@/features/quotes/components/note-archive-revocation-actions";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import type { NotePaymentHistoryItem } from "@/features/payments/lib/payment-register";
import { Icon } from "@/components/ui/icon";
import type { CustomerOption } from "@/features/quotes/components/quote-builder-contracts";
import type { QuoteFormActionState } from "@/features/quotes/actions";

type WorkOrderItem = CompletedNoteItem;

type PaymentResult = {
  payment: { amountCents: number };
  paidCents: number;
  remainingCents: number;
};

type WorkOrderPaymentAction = {
  workOrderId: string;
  action: (amount: string, operationKey: string, method: string) => Promise<PaymentResult>;
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
  correctWorkOrderActions?: WorkOrderCommercialCorrectionAction[];
  shareAction: (quoteId: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  archiveRevocationActions?: NoteArchiveRevocationAction[];
  rollbackAction?: WorkOrderActions["rollback"];
  noteReturnTo?: string;
  paymentHistories?: Array<{ workOrderId: string; totalCents: number; payments: NotePaymentHistoryItem[] }>;
}

/** Icon-only footer tool on the 32px control with a 44px touch area. */
const toolClassName = "h-[var(--control-sm)] w-[var(--control-sm)] shrink-0 justify-center gap-0 px-0";

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(date));
}

function unitIdentityOf(wo: WorkOrderItem) {
  const vehicle = wo.quote.vehicle;
  return formatUnitIdentity({
    economicNumber: vehicle?.economicNumber,
    plates: vehicle?.plate,
    model: [vehicle?.brand, vehicle?.model].filter(Boolean).join(" "),
  });
}

export function WorkOrderCompletedList({
  workOrders,
  quoteMap,
  customers = [],
  searchCustomersAction,
  recordPaymentActions = [],
  correctWorkOrderActions = [],
  shareAction,
  archiveRevocationActions = [],
  rollbackAction,
  noteReturnTo = "/admin/notas",
  paymentHistories = [],
}: WorkOrderCompletedListProps) {
  const paymentActionMap = new Map(recordPaymentActions.map((p) => [p.workOrderId, p.action]));
  const correctWorkOrderActionMap = new Map(correctWorkOrderActions.map((c) => [c.workOrderId, c.action]));
  const archiveRevocationActionMap = new Map(archiveRevocationActions.map((action) => [action.quoteId, action]));
  const [selectedWorkOrderId, setSelectedWorkOrderId] = React.useState<string | null>(null);
  const [previewQuoteId, setPreviewQuoteId] = React.useState<string | null>(null);

  return (
    <>
      <div className="grid auto-rows-fr gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
      {workOrders.map((wo) => {
        const correctWorkOrderAction = correctWorkOrderActionMap.get(wo.id);
        const archiveRevocationAction = archiveRevocationActionMap.get(wo.quote.id);
        const totalCents = wo.quote.effectiveTotalCents ?? Number(wo.quote.totalCents);
        const dueDate = wo.paymentDueDate ?? wo.quote.paymentDueDate ?? null;
        const noteFolio = resolveDocumentFolio(wo);
        const antecedentQuoteFolio = resolveAntecedentQuoteFolio(wo.quote);
        const identity = resolveCustomerDisplayIdentity(wo.quote);
        const paymentState = derivePaymentState({
          completedAt: wo.completedAt,
          paymentDueDate: dueDate,
          paidCents: wo.quote.paidCents ?? 0,
          remainingCents: wo.quote.remainingCents ?? totalCents,
        });
        const paymentStatusLabel = paymentState.label === "Pagada"
          ? "Pagada"
          : paymentState.label === "Vencida"
            ? "Vencida"
            : "Pendiente";
        const quoteDetail = quoteMap?.get(wo.quote.id) ?? wo.quote;
        const remainingCents = wo.quote.remainingCents ?? totalCents;

        const workOrder = wo.kind === "WORK" ? wo : null;

        return (
          <React.Fragment key={wo.id}>
            <QuotePreviewDialog
              quote={quoteDetail as never}
              previewTitle={`Nota ${noteFolio}`}
              open={previewQuoteId === wo.quote.id}
              onOpenChange={(open) => setPreviewQuoteId(open ? wo.quote.id : null)}
              showTrigger={false}
            />
            <EntityCard
              className="h-full"
              openLabel={`Ver vista previa de nota ${noteFolio}`}
              onOpen={() => setPreviewQuoteId(wo.quote.id)}
              title={wo.quote.title || "Sin título"}
              folio={noteFolio}
              status={<Badge variant={paymentState.variant} className="w-fit">{paymentStatusLabel}</Badge>}
              amount={formatCents(totalCents)}
              customer={identity.displayName}
              unit={unitIdentityOf(wo)}
              driver={identity.operatorName ?? null}
              keyData={
                <div className="grid gap-1">
                  <p>
                    Cot. {antecedentQuoteFolio} · {wo.isSpecial
                      ? "Taller"
                      : wo.assignments.find((a) => a.worker.workerKind === "MASTER")?.worker.displayName ?? "Sin maestro"}
                  </p>
                  <p>
                    Finalizada {formatDate(wo.completedAt)}
                    {dueDate ? ` · Vence ${formatDate(dueDate)}` : ""}
                  </p>
                  <p className={remainingCents === 0 ? "text-[var(--color-status-success-fg)]" : undefined}>
                    Saldo pendiente {formatCents(remainingCents)}
                  </p>
                </div>
              }
              editAction={correctWorkOrderAction ? (
                <QuoteBuilderDialog
                  customers={customers}
                  quote={quoteDetail as never}
                  quoteNumber={wo.quote.number}
                  saveAction={correctWorkOrderAction}
                  searchCustomersAction={searchCustomersAction}
                  triggerLabel="Corregir nota"
                  triggerAriaLabel="Corregir nota"
                  triggerVariant="ghost"
                  triggerSize="sm"
                  triggerClassName={toolClassName}
                  triggerIconOnly
                />
              ) : undefined}
              printAction={
                <PrintActionButton
                  url={`/admin/notas/${wo.id}/print?returnTo=${encodeURIComponent(noteReturnTo)}`}
                  variant="ghost"
                  size="sm"
                  className={toolClassName}
                  title={`Imprimir nota de remisión ${noteFolio}`}
                  aria-label={`Imprimir nota de remisión ${noteFolio}`}
                >
                  <Icon name="print" className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Imprimir</span>
                </PrintActionButton>
              }
              shareAction={
                <ShareQuoteButton
                  action={shareAction.bind(null, wo.quote.id)}
                  quoteNumber={wo.quote.number}
                  variant="ghost"
                  className={toolClassName}
                  iconOnly
                />
              }
              overflowAction={
                <OperationalActionsMenu
                  title="Acciones de nota"
                  description={`Opciones para la nota ${noteFolio}.`}
                  triggerAriaLabel={`Más acciones de nota ${noteFolio}`}
                  triggerTitle={`Más acciones de nota ${noteFolio}`}
                  triggerClassName={toolClassName}
                  triggerIconOnly
                  destructive={
                    rollbackAction && workOrder ? (
                      <WorkOrderOperationsDialog
                        quoteNumber={wo.quote.number}
                        quoteStatus="APPROVED"
                        workOrder={workOrder as never}
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
                </OperationalActionsMenu>
              }
              stateAction={
                <Button
                  type="button"
                  variant="tonal"
                  className="w-full justify-center"
                  onClick={() => setSelectedWorkOrderId(wo.id)}
                >
                  {remainingCents > 0 && paymentActionMap.has(wo.id) ? "Registrar pago" : "Ver pagos"}
                </Button>
              }
            />
          </React.Fragment>
        );
      })}
    </div>

    {selectedWorkOrderId ? (() => {
      const selected = workOrders.find((item) => item.id === selectedWorkOrderId);
      if (!selected) return null;
      return (
        <NotaDetailDialog
          workOrderId={selected.id}
          workOrderNumber={selected.number}
          quote={(quoteMap?.get(selected.quote.id) ?? selected.quote) as never}
          paymentDueDate={selected.paymentDueDate ?? selected.quote.paymentDueDate ?? null}
          noteFolio={resolveDocumentFolio(selected)}
          customerName={resolveCustomerDisplayIdentity(selected.quote).displayName}
          open
          onOpenChange={(open) => { if (!open) setSelectedWorkOrderId(null); }}
          noteReturnTo={noteReturnTo}
          paymentHistory={paymentHistories.find((history) => history.workOrderId === selected.id)}
          paymentAction={paymentActionMap.get(selected.id)}
          correctWorkOrderAction={correctWorkOrderActionMap.get(selected.id)}
          shareAction={shareAction.bind(null, selected.quote.id)}
          customers={customers}
          searchCustomersAction={searchCustomersAction}
        />
      );
    })() : null}
  </>
  );
}
