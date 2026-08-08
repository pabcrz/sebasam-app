"use client";

import * as React from "react";
import { Pencil, Copy } from "lucide-react";
import type { PaymentRequest, QuoteStatus, SharedQuote } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import { Badge, Button, TableCell, TableRow } from "@/components/ui";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { isQuoteEditable } from "@/features/quotes/lib/editability";
import { QuotePreviewDialog } from "./quote-preview-dialog";
import { QuoteApprovalForm } from "./quote-approval-form";
import { QuoteCancelForm } from "./quote-cancel-form";
import { ShareQuoteButton } from "./share-quote-button";
import { ShareQuoteLinkDialog } from "./share-quote-link-dialog";
import { QuoteAuthorizeForm } from "./quote-authorize-form";
import { PaymentRequestLinkDialog } from "@/features/payment-requests/components/payment-request-link-dialog";
import type { PaymentRequestDialogBankAccount } from "@/features/payment-requests/components/payment-request-link-dialog";
import { createPaymentRequestDialogContext } from "@/features/quotes/lib/payment-request-dialog-context";
import { QuoteBuilderDialog } from "./quote-builder-dialog";
import { QuoteActionsMenu } from "./quote-actions-menu";
import type { CustomerOption } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";
import { WorkOrderOperationsDialog } from "@/features/work-orders/components/work-order-operations-dialog";
import type { WorkOrderActions, WorkerOption } from "@/features/work-orders/components/work-order-operations-dialog";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

interface QuoteListRowProps {
  quote: QuoteListItem;
  quoteStatusLabels: Record<QuoteStatus, string>;
  quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info">;
  approveAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  shareAction: (formData: FormData) => void | Promise<void>;
  authorizeAction: (note: string) => Promise<{ success: boolean; error?: string }>;
  paymentRequestAction: () => Promise<PaymentRequest>;
  paymentRequestBankAccounts: PaymentRequestDialogBankAccount[];
  duplicateAction: (formData: FormData) => void | Promise<void>;
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
  approveAction,
  cancelAction,
  shareAction,
  authorizeAction,
  paymentRequestAction,
  paymentRequestBankAccounts,
  duplicateAction,
  customers,
  saveAction,
  searchCustomersAction,
  workers,
  workOrderActions,
}: QuoteListRowProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const editable = isQuoteEditable(quote);
  const paymentRequestContext = createPaymentRequestDialogContext(quote, paymentRequestBankAccounts);
  const canUsePaymentActions = quote.status === "APPROVED" && quote.workOrder?.status === "IN_PROGRESS";

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
        </div>
      </TableCell>
      <TableCell>{quote.customer.name}</TableCell>
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

          <form action={duplicateAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" variant="outline" size="sm" title="Duplicar cotización">
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Duplicar</span>
            </Button>
          </form>

          {quote.activeSharedQuote ? (
            <ShareQuoteLinkDialog
              sharedQuote={quote.activeSharedQuote as SharedQuote}
              quoteNumber={quote.number}
            />
          ) : quote.status === "DRAFT" || quote.status === "SENT" || quote.status === "APPROVED" ? (
            <ShareQuoteButton
              action={shareAction}
              quoteId={quote.id}
              quoteNumber={quote.number}
            />
          ) : null}

          {quote.status === "DRAFT" || quote.status === "SENT" ? (
            <QuoteAuthorizeForm
              action={authorizeAction}
              quoteNumber={quote.number}
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

          {canUsePaymentActions ? (
            <PaymentRequestLinkDialog action={paymentRequestAction} context={paymentRequestContext} />
          ) : null}
        </div>

      </TableCell>
    </TableRow>
  );
}
