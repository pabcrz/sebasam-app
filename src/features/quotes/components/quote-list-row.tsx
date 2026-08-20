"use client";

import * as React from "react";
import type { PaymentRequest, QuoteStatus } from "@prisma/client";
import type { QuoteListSummary } from "@/features/quotes/queries";
import { Badge, TableCell, TableRow } from "@/components/ui";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { isQuoteEditable } from "@/features/quotes/lib/editability";
import { QuotePreviewDialog } from "./quote-preview-dialog";
import { QuoteCancelForm } from "./quote-cancel-form";
import { QuoteDuplicateForm } from "./quote-duplicate-form";
import { QuoteDeleteForm } from "./quote-delete-form";
import { ShareQuoteButton } from "./share-quote-button";
import { QuoteAuthorizeForm } from "./quote-authorize-form";
import { QuoteCorrectDecisionForm } from "./quote-correct-decision-form";
import { PaymentRequestLinkDialog } from "@/features/payment-requests/components/payment-request-link-dialog";
import type { PaymentRequestDialogBankAccount } from "@/features/payment-requests/components/payment-request-link-dialog";
import { createPaymentRequestDialogContext } from "@/features/quotes/lib/payment-request-dialog-context";
import { QuoteBuilderDialog } from "./quote-builder-dialog";
import type { CustomerOption } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";
import { WorkOrderOperationsDialog } from "@/features/work-orders/components/work-order-operations-dialog";
import type { WorkOrderActions, WorkerOption } from "@/features/work-orders/components/work-order-operations-dialog";

type QuoteListItem = QuoteListSummary;

interface QuoteListRowProps {
  quote: QuoteListItem;
  quoteStatusLabels: Record<QuoteStatus, string>;
  quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info">;
  approveAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  shareAction: () => Promise<{ success: boolean; error?: string }>;
  authorizeAction: (note: string, authorizedSectionIds?: string[]) => Promise<{ success: boolean; error?: string }>;
  correctDecisionAction: (quoteId: string, nextStatus: "APPROVED" | "REJECTED") => Promise<{ success: boolean; error?: string }>;
  paymentRequestAction: () => Promise<PaymentRequest>;
  paymentRequestBankAccounts: PaymentRequestDialogBankAccount[];
  cashPaymentAction: (amount: string, operationKey: string) => Promise<{
    payment: { amountCents: number };
    paidCents: number;
    remainingCents: number;
  }>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  archiveAction: (reason: string) => Promise<void>;
  restoreAction: (reason: string) => Promise<void>;
  customers: CustomerOption[];
  saveAction: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  searchCustomersAction: (input: unknown) => Promise<CustomerOption[]>;
  workers?: WorkerOption[];
  workOrderActions?: WorkOrderActions;
}

export function QuoteListRow({
  quote,
  quoteStatusLabels,
  quoteStatusBadgeVariant,
  approveAction: _approveAction,
  cancelAction,
  shareAction,
  authorizeAction,
  correctDecisionAction,
  paymentRequestAction,
  paymentRequestBankAccounts,
  cashPaymentAction: _cashPaymentAction,
  duplicateAction,
  deleteAction,
  archiveAction,
  restoreAction,
  customers,
  saveAction,
  searchCustomersAction,
  workers,
  workOrderActions,
}: QuoteListRowProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const editable = isQuoteEditable(quote);
  const canUsePaymentActions = quote.status === "APPROVED" && quote.workOrder?.status === "IN_PROGRESS";
  const paymentRequestContext = canUsePaymentActions && quote.customer &&
    quote.subtotalCents !== null && quote.taxCents !== null && quote.totalCents !== null
    ? createPaymentRequestDialogContext({ ...quote, customer: quote.customer }, paymentRequestBankAccounts)
    : null;

  return (
    <TableRow
      onClick={() => setPreviewOpen(true)}
      className="cursor-pointer"
      aria-label={`Abrir vista previa de ${quote.number}`}
    >
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-wrap items-start gap-1">
          <span className="font-medium">{quote.number}</span>
          <Badge variant={quoteStatusBadgeVariant[quote.status]} className="w-fit">
            {quoteStatusLabels[quote.status]}
          </Badge>
          {quote.status === "DRAFT" && quote.submissionKey ? (
            <Badge variant="warning" className="w-fit">Editada</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>{quote.customer?.name ?? "Sin cliente"}</TableCell>
      <TableCell>
        {quote.vehicle ? formatVehicle(quote.vehicle) : formatSnapshotVehicle(quote.vehicleSnapshot)}
      </TableCell>
      <TableCell>{quote.title}</TableCell>
      <TableCell>
        {quote.workOrder ? (
          <span className="text-sm text-[var(--color-text-muted)]">{quote.workOrder.number}</span>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]">Ninguna</span>
        )}
      </TableCell>
      <TableCell className="min-w-[150px]">
        <dl className="grid gap-1 text-sm">
          <div className="flex items-center justify-between gap-3 text-[var(--color-text-muted)]">
            <dt>Subtotal</dt>
            <dd>{formatCents(quote.subtotalCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 text-[var(--color-text-muted)]">
            <dt>IVA</dt>
            <dd>{formatCents(quote.taxCents)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 text-base font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
            <dt>Total</dt>
            <dd>{formatCents(quote.totalCents)}</dd>
          </div>
        </dl>
      </TableCell>
      <TableCell>{quote.validUntil ? formatDate(quote.validUntil) : "—"}</TableCell>
      <TableCell className="min-w-[230px]" onClick={(event) => event.stopPropagation()}>
        <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} showTrigger={false} />
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {editable ? (
            <QuoteBuilderDialog
              customers={customers}
              saveAction={saveAction}
              searchCustomersAction={searchCustomersAction}
              quote={quote}
              quoteNumber={quote.number}
              triggerSize="sm"
              triggerVariant="outline"
            />
          ) : null}

          <QuoteDuplicateForm action={duplicateAction} quoteId={quote.id} />

          {quote.status === "DRAFT" || quote.status === "CANCELLED" ? (
            <QuoteDeleteForm action={deleteAction} quoteId={quote.id} quoteNumber={quote.number} />
          ) : null}

          {quote.status === "DRAFT" || (quote.activeSharedQuote && (quote.status === "SENT" || quote.status === "APPROVED")) ? (
            <ShareQuoteButton
              action={shareAction}
              sharedQuote={quote.activeSharedQuote ?? undefined}
              status={quote.status}
              quoteNumber={quote.number}
            />
          ) : null}

          {quote.status === "SENT" ? (
            <QuoteAuthorizeForm
              action={authorizeAction}
              quoteNumber={quote.number}
              sections={quote.sections}
              variant="outline"
              size="sm"
            />
          ) : null}

          {(quote.status === "APPROVED" || quote.status === "REJECTED") && !quote.workOrder ? (
            <QuoteCorrectDecisionForm
              action={correctDecisionAction}
              quoteId={quote.id}
              quoteNumber={quote.number}
              currentStatus={quote.status}
              variant="outline"
              size="sm"
            />
          ) : null}

          {quote.status === "APPROVED" ? (
            <WorkOrderOperationsDialog
              quoteNumber={quote.number}
              quoteStatus={quote.status}
              workOrder={quote.workOrder}
              workers={workers}
              actions={workOrderActions}
            />
          ) : null}

          {quote.status === "DRAFT" || quote.status === "SENT" ? (
            <QuoteCancelForm
              action={cancelAction}
              quoteId={quote.id}
              quoteNumber={quote.number}
              variant="outline"
              size="sm"
            />
          ) : null}

          {canUsePaymentActions && paymentRequestContext ? (
            <PaymentRequestLinkDialog action={paymentRequestAction} context={paymentRequestContext} />
          ) : null}
        </div>

      </TableCell>
    </TableRow>
  );
}
