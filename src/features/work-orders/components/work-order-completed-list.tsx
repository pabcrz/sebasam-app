"use client";

import * as React from "react";
import type { CompletedNoteItem } from "@/features/work-orders/queries";
import {
  Badge,
  Button,
  DialogClose,
  OperationalActionsMenu,
  OperationalCardActions,
  OperationalCardLayout,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { derivePaymentState } from "@/features/work-orders/payment-state";
import { NotaDetailDialog } from "./nota-detail-dialog";
import { NotaCard } from "./nota-card";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";
import { resolveDocumentFolio, resolveAntecedentQuoteFolio } from "@/features/quotes/lib/document-resolver";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { NoteArchiveRevocationAction } from "@/features/quotes/components/note-archive-revocation-actions";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import type { NotePaymentHistoryItem } from "@/features/payments/lib/payment-register";
import { ClipboardList, Printer } from "lucide-react";
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
      <div className="grid gap-3 lg:grid-cols-2">
      {workOrders.map((wo) => {
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
        const paymentStatusLabel = paymentState.label === "Pagada"
          ? "Pagada"
          : paymentState.label === "Vencida"
            ? "Vencida"
            : "Pendiente";
        const quoteDetail = quoteMap?.get(wo.quote.id) ?? wo.quote;
        const remainingCents = wo.quote.remainingCents ?? totalCents;

        const frequentActions = (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedWorkOrderId(wo.id)}
              aria-label={`Gestionar pagos de nota ${noteFolio}`}
              title="Gestionar pagos"
              className="h-11 w-full min-w-0 justify-center gap-0 px-0 sm:h-9 sm:w-full sm:min-w-0 sm:gap-0 sm:px-0"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Gestionar pagos</span>
            </Button>
            <ShareQuoteButton
              action={shareAction.bind(null, wo.quote.id)}
              quoteNumber={wo.quote.number}
              variant="outline"
              className="h-11 w-full min-w-0 justify-center gap-0 px-0 sm:h-9 sm:w-full sm:min-w-0 sm:gap-0 sm:px-0"
              iconOnly
            />
               <PrintActionButton
              url={`/admin/notas/${wo.id}/print?returnTo=${encodeURIComponent(noteReturnTo)}`}
              variant="outline"
              size="sm"
              className="h-11 w-full min-w-0 justify-center gap-0 px-0 sm:h-9 sm:w-full sm:min-w-0 sm:gap-0 sm:px-0"
               title={`Imprimir nota de remisión ${noteFolio}`}
               aria-label={`Imprimir nota de remisión ${noteFolio}`}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Imprimir</span>
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
                 triggerIconOnly
              />
            ) : null}
          </>
        );

        const workOrder = wo.kind === "WORK" ? wo : null;
        const overflowAction = (
          <OperationalActionsMenu
            title="Acciones de nota"
            description={`Opciones para la nota ${noteFolio}.`}
            triggerAriaLabel={`Más acciones de nota ${noteFolio}`}
            triggerTitle={`Más acciones de nota ${noteFolio}`}
            triggerClassName="h-11 w-11 shrink-0 justify-center gap-0 px-0 sm:h-9 sm:w-9 sm:px-0"
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
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedWorkOrderId(wo.id)}
              >
                Ver pagos e historial
              </Button>
            </DialogClose>
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
        );

        return (
          <NotaCard
            key={wo.id}
            onOpen={() => setPreviewQuoteId(wo.quote.id)}
            openLabel={`Ver vista previa de nota ${noteFolio}`}
             actions={
               <>
                 <QuotePreviewDialog
                   quote={quoteDetail as never}
                   previewTitle={`Nota ${noteFolio}`}
                   open={previewQuoteId === wo.quote.id}
                   onOpenChange={(open) => setPreviewQuoteId(open ? wo.quote.id : null)}
                   showTrigger={false}
                 />
                 <OperationalCardActions
                   frequent={frequentActions}
                   overflow={overflowAction}
                   className="gap-1"
                   actionGapClassName="gap-1"
                 />
               </>
             }
             className="!w-full !min-w-0 !p-2"
             body={
              <OperationalCardLayout
                 header={
                   <div className="grid min-w-0 gap-2">
                     <div className="flex min-w-0 items-center justify-between gap-3">
                       <span className="min-w-0 truncate text-xs font-bold text-[var(--color-text-main)]">{noteFolio}</span>
                       <Badge variant={paymentState.variant} className="w-fit shrink-0">
                         {paymentStatusLabel}
                       </Badge>
                     </div>
                     <p className="w-full text-right font-mono text-2xl font-extrabold leading-tight tabular-nums whitespace-nowrap text-[var(--color-total-emphasis)]">
                       {formatCents(totalCents)}
                     </p>
                   </div>
                 }
                identity={
                  <div className="min-w-0">
                    <p className="min-w-0 truncate font-semibold text-[var(--color-text-main)]">
                      {resolveCustomerDisplayIdentity(wo.quote).displayName}
                    </p>
                    <p className="min-w-0 truncate text-sm text-[var(--color-text-muted)]">
                      {[
                        resolveCustomerDisplayIdentity(wo.quote).operatorName
                          ? `${resolveCustomerDisplayIdentity(wo.quote).operatorRole}: ${resolveCustomerDisplayIdentity(wo.quote).operatorName}`
                          : null,
                        formatVehicle(wo),
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                }
                context={
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--color-text-muted)]">
                      <span className="min-w-0 break-words font-medium">Cot. {antecedentQuoteFolio}</span>
                      <span>·</span>
                      <span className="min-w-0 break-words">
                        {wo.isSpecial
                          ? "Taller"
                          : wo.assignments.find((a) => a.worker.workerKind === "MASTER")?.worker.displayName ??
                            "Sin maestro"}
                      </span>
                    </div>
                     <div className="flex flex-wrap gap-x-2 text-sm text-[var(--color-text-muted)]">
                       {remainingCents > 0 ? <><span>Total {formatCents(totalCents)}</span><span>·</span></> : null}
                       <span className={remainingCents === 0 ? "text-[var(--color-status-success-fg)]" : undefined}>
                         Saldo pendiente {formatCents(remainingCents)}
                       </span>
                    </div>
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
