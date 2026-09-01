"use client";

import * as React from "react";
import { CalendarDays, Car, ClipboardList, Printer } from "lucide-react";
import Link from "next/link";
import type { PaymentRequest, QuoteStatus } from "@prisma/client";
import type { QuoteListSummary } from "@/features/quotes/queries";
import { Badge, Button } from "@/components/ui";
import { formatCents, formatDate, formatOperationalDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
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
import { QuoteLifecycleForm } from "./quote-lifecycle-form";
import type { CustomerOption } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";
import { WorkOrderOperationsDialog } from "@/features/work-orders/components/work-order-operations-dialog";
import type { WorkOrderActions, WorkerOption } from "@/features/work-orders/components/work-order-operations-dialog";
import { QuoteActionsMenu } from "./quote-actions-menu";
import { resolveQuoteActionPresentation, type QuoteActionId } from "./quote-action-presentation";

type QuoteListItem = QuoteListSummary;

interface QuoteListCardProps {
  quote: QuoteListItem;
  quoteStatusLabels: Record<QuoteStatus, string>;
  quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info">;
  approveAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  shareAction: () => Promise<{ success: boolean; error?: string }>;
  authorizeAction: (note: string, authorizedSectionIds?: string[]) => Promise<{ success: boolean; error?: string }>;
  correctDecisionAction: (quoteId: string, nextStatus: "APPROVED" | "REJECTED" | "DRAFT") => Promise<{ success: boolean; error?: string }>;
  paymentRequestAction: () => Promise<PaymentRequest>;
  paymentRequestBankAccounts: PaymentRequestDialogBankAccount[];
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

export function QuoteListCard({
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
  duplicateAction,
  deleteAction,
  archiveAction,
  restoreAction,
  customers,
  saveAction,
  searchCustomersAction,
  workers,
  workOrderActions,
}: QuoteListCardProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const editable = isQuoteEditable(quote);
  const openPreview = React.useCallback(() => setPreviewOpen(true), []);
  const vehicleDescription = quote.vehicle
    ? formatVehicle(quote.vehicle)
    : formatSnapshotVehicle(quote.vehicleSnapshot);
  const canUsePaymentActions = quote.status === "APPROVED" && quote.workOrder?.status === "IN_PROGRESS";
  const paymentRequestContext = canUsePaymentActions && quote.customer &&
    quote.subtotalCents !== null && quote.taxCents !== null && quote.totalCents !== null
    ? createPaymentRequestDialogContext({ ...quote, customer: quote.customer }, paymentRequestBankAccounts)
    : null;
  const printHref = quote.workOrder?.status === "COMPLETED"
    ? `/admin/notas/${quote.workOrder.id}/print?returnTo=/admin/notas`
    : `/admin/quotes/${quote.id}/print?returnTo=/admin/quotes`;
  const actionPresentation = resolveQuoteActionPresentation({
    status: quote.status,
    editable,
    hasActiveSharedQuote: Boolean(quote.activeSharedQuote),
    hasWorkOrder: Boolean(quote.workOrder),
    paymentAvailable: paymentRequestContext !== null,
  });

  const renderAction = (action: QuoteActionId, variant: "primary" | "outline" = "outline") => {
    switch (action) {
      case "print":
        return (
          <Button
            asChild
            type="button"
            variant={variant}
            size="sm"
            className="min-h-11 min-w-11 px-3 sm:px-0"
            aria-label={`Imprimir cotización ${quote.number}`}
            title={`Imprimir cotización ${quote.number}`}
          >
            <Link href={printHref}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span className="sm:hidden">Imprimir</span>
            </Link>
          </Button>
        );
      case "edit":
        return (
          <QuoteBuilderDialog
            customers={customers}
            saveAction={saveAction}
            searchCustomersAction={searchCustomersAction}
            quote={quote}
            quoteNumber={quote.number}
            triggerAriaLabel={`Editar cotización ${quote.number}`}
            triggerSize="sm"
            triggerVariant={variant}
            triggerClassName="w-full"
          />
        );
      case "share":
        return (
          <ShareQuoteButton
            action={shareAction}
            sharedQuote={quote.activeSharedQuote ?? undefined}
            status={quote.status}
            quoteNumber={quote.number}
            variant={variant}
            className="w-full"
          />
        );
      case "authorize":
        return <QuoteAuthorizeForm action={authorizeAction} quoteNumber={quote.number} sections={quote.sections} variant={variant} size="sm" />;
      case "correctDecision":
        return (
          <QuoteCorrectDecisionForm
            action={correctDecisionAction}
            quoteId={quote.id}
            quoteNumber={quote.number}
            currentStatus={quote.status as "APPROVED" | "REJECTED"}
            variant={variant}
            size="sm"
          />
        );
      case "workOrder":
        return (
          <WorkOrderOperationsDialog
            quoteNumber={quote.number}
            quoteStatus={quote.status}
            workOrder={quote.workOrder}
            workers={workers}
            actions={workOrderActions}
            triggerVariant={variant}
          />
        );
      case "paymentLink":
        return paymentRequestContext ? <PaymentRequestLinkDialog action={paymentRequestAction} context={paymentRequestContext} /> : null;
      case "duplicate":
        return <QuoteDuplicateForm action={duplicateAction} quoteId={quote.id} />;
      case "cancel":
        return <QuoteCancelForm action={cancelAction} quoteId={quote.id} quoteNumber={quote.number} variant={variant} size="sm" />;
      case "archive":
        return <QuoteLifecycleForm action={archiveAction} mode="archive" quoteNumber={quote.number} />;
      case "restore":
        return <QuoteLifecycleForm action={restoreAction} mode="restore" quoteNumber={quote.number} />;
      case "delete":
        return <QuoteDeleteForm action={deleteAction} quoteId={quote.id} quoteNumber={quote.number} />;
    }
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm">
      <button
        type="button"
        onClick={openPreview}
        className="block w-full cursor-pointer rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
        aria-label={`Abrir vista previa de ${quote.number}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-6 text-[var(--color-text-main)]">
              {quote.title || "Sin título"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span>Folio {quote.number}</span>
              <Badge variant={quoteStatusBadgeVariant[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
              {quote.status === "DRAFT" && quote.submissionKey ? (
                <Badge variant="warning">Editada</Badge>
              ) : null}
            </div>
          </div>
          <p className="shrink-0 text-2xl font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
            {formatCents(quote.totalCents)}
          </p>
        </div>

        <p className="mt-3 text-sm font-medium text-[var(--color-text-main)]">
            {quote.customer?.name ?? "Sin cliente"}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Car className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{vehicleDescription || "Sin vehículo"}</span>
        </p>

        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
          {quote.workOrder ? (
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <ClipboardList className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-[var(--color-text-muted)]">Orden de trabajo</span>
                  <span className="block truncate text-sm font-medium text-[var(--color-text-main)]">
                    {quote.workOrder.number}
                  </span>
                </span>
              </span>
              <span className="text-sm font-medium text-[var(--color-text-main)]">{quote.workOrder.number}</span>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Sin orden de trabajo
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-border-light)] pt-3 text-xs text-[var(--color-text-muted)]">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Fecha de cotización: {formatOperationalDate(quote.operationalDate)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Vigente hasta: {quote.validUntil ? formatDate(quote.validUntil) : "—"}</span>
          </p>
        </div>
      </button>

      <div className="mt-4 grid gap-2">
        <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} showTrigger={false} />
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          {actionPresentation.primary ? (
            <div className="min-w-0 flex-1">{renderAction(actionPresentation.primary, "primary")}</div>
          ) : null}
          {actionPresentation.frequent.map((action) => (
            <div key={action} className="min-w-0 flex-1 sm:flex-none">{renderAction(action)}</div>
          ))}
          <div className="min-w-0 flex-1 sm:flex-none">
            <QuoteActionsMenu
              quoteNumber={quote.number}
              destructive={actionPresentation.destructive ? renderAction(actionPresentation.destructive) : null}
            >
              {actionPresentation.overflow.map((action) => <React.Fragment key={action}>{renderAction(action)}</React.Fragment>)}
            </QuoteActionsMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
