"use client";

import { resolveDocumentDates } from "@/features/quotes/lib/document-dates";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { PrintActionButton } from "./print-action-button";
import { QuoteItemType } from "@/generated/prisma/enums";
import type { PaymentRequest, QuoteStatus } from "@/generated/prisma/client";
import type { QuoteListSummary } from "@/features/quotes/queries";
import { Badge, EntityCard } from "@/components/ui";
import { formatUnitIdentity } from "@/lib/unit-identity";
import { formatCents, formatDate, formatOperationalDate } from "@/features/quotes/lib/format";
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
import { isQuoteCommercialReady } from "@/features/quotes/lib/commercial-validation";
import { isQuoteSaleConversionActionDisabled } from "./quote-sale-conversion-readiness";

type QuoteListItem = QuoteListSummary;

interface QuoteListCardProps {
  quote: QuoteListItem;
  quoteStatusLabels: Record<QuoteStatus, string>;
  quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info">;
  approveAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  shareAction: () => Promise<{ success: boolean; token?: string; error?: string }>;
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

const textValue = (value: unknown) => (typeof value === "string" ? value : null);

export function QuoteListCard({
  quote,
  quoteStatusLabels,
  quoteStatusBadgeVariant,
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
  const { paymentDueDate } = resolveDocumentDates(quote);
  const editable = isQuoteEditable(quote);
  const openPreview = React.useCallback(() => setPreviewOpen(true), []);
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
    hasWorkOrder: Boolean(quote.workOrder),
    paymentAvailable: paymentRequestContext !== null,
  });
  const quoteAllowsOperations = ["DRAFT", "SENT", "APPROVED"].includes(quote.status);
  const workItems = quote.sections.length > 0
    ? quote.sections.flatMap((section) => section.items)
    : quote.items;
  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const hasIdentifiableUnit = Boolean(
    quote.vehicle?.plate?.trim() || (snapshot.plate && String(snapshot.plate).trim()) ||
    ((quote.vehicle?.brand?.trim() || (snapshot.brand && String(snapshot.brand).trim())) &&
      (quote.vehicle?.model?.trim() || (snapshot.model && String(snapshot.model).trim()))),
  );
  const unitIdentity = quote.vehicle
    ? formatUnitIdentity({
      economicNumber: quote.vehicle.economicNumber,
      plates: quote.vehicle.plate,
      model: [quote.vehicle.brand, quote.vehicle.model].filter(Boolean).join(" "),
    })
    : formatUnitIdentity({
      economicNumber: textValue(snapshot.economicNumber),
      plates: textValue(snapshot.plate),
      model: [textValue(snapshot.brand), textValue(snapshot.model)].filter(Boolean).join(" "),
    });
  const workStartReady = (Boolean(quote.customerId) || hasIdentifiableUnit) && workItems.length > 0 && workItems.every((item) => {
    const quantity = Number(item.quantity);
    return Object.values(QuoteItemType).includes(item.type) && item.description.trim() !== "" && Number.isInteger(quantity) && quantity > 0;
  });
  const commercialReady = isQuoteCommercialReady(quote);
  const saleConversionDisabled = isQuoteSaleConversionActionDisabled(quote, {
    hasConvertAction: Boolean(workOrderActions?.convert),
  });
  const shareDisabled = !["DRAFT", "SENT", "APPROVED"].includes(quote.status) || !commercialReady;
  const flowDisabled = quote.operation === "SALE"
    ? saleConversionDisabled
    : !quoteAllowsOperations || (Boolean(quote.payableNote) && !quote.workOrder) ||
      (!quote.workOrder && (!workStartReady || !workOrderActions?.assign));

  const primary = actionPresentation.primary;
  const toolActions = (["edit", "print", "share"] as const).filter((action) => action !== primary);
  // The flow stays reachable in More actions even when another action is primary.
  const overflowActions = actionPresentation.overflow.includes("workOrder") || primary === "workOrder"
    ? actionPresentation.overflow
    : [...actionPresentation.overflow, "workOrder" as const];

  const renderAction = (
    action: QuoteActionId,
    variant: "primary" | "secondary" | "outline" | "tonal" | "danger" = "outline",
    presentation: "default" | "tile" | "state" = "default",
  ) => {
    const disabledActionClassName = "disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)] disabled:shadow-none disabled:hover:bg-[var(--color-surface-muted)] disabled:hover:text-[var(--color-text-muted)]";
    const tileClassName = presentation === "tile"
      ? `h-[var(--control-sm)] w-[var(--control-sm)] shrink-0 justify-center gap-0 px-0 ${disabledActionClassName}`
      : presentation === "state"
        ? `max-w-full ${disabledActionClassName}`
        : `w-full ${disabledActionClassName}`;

    switch (action) {
      case "print":
        return (
          <PrintActionButton
            url={printHref}
            variant={variant === "tonal" ? "outline" : variant}
            size="sm"
            className={presentation === "tile" ? tileClassName : "min-h-11 min-w-11 px-3 sm:px-0"}
            aria-label={`Imprimir cotización ${quote.number}`}
            title={`Imprimir cotización ${quote.number}`}
          >
            <Icon name="print" className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Imprimir</span>
          </PrintActionButton>
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
            triggerClassName={tileClassName}
            triggerIconOnly={presentation === "tile"}
            triggerDisabled={!editable}
          />
        );
      case "share":
        return (
          <ShareQuoteButton
            action={shareAction}
            quoteNumber={quote.number}
            variant={variant}
            size={presentation === "tile" ? "sm" : "default"}
            className={tileClassName}
            actionLabelClassName={presentation === "tile" ? "sr-only" : undefined}
            disabled={shareDisabled}
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
            quoteId={quote.id}
            quoteOperation={quote.operation}
            hasPayableNote={Boolean(quote.payableNote)}
            quoteNumber={quote.number}
            quoteStatus={quote.status}
            workOrder={quote.workOrder}
            workers={workers}
            actions={workOrderActions}
            triggerVariant={variant}
            triggerIconOnlyMobile={false}
            triggerClassName={tileClassName}
            alwaysRenderTrigger
            triggerDisabled={flowDisabled}
            triggerFlowLabel={quote.operation === "SALE" ? "Crear nota de venta" : "Asignar trabajo"}
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

  const displayFolio = quote.folio ?? quote.number;

  return (
    <>
      <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} showTrigger={false} />
      <EntityCard
        className="h-full"
        openLabel={`Abrir vista previa de ${displayFolio}`}
        onOpen={openPreview}
        title={quote.title || "Sin título"}
        folio={`Folio ${displayFolio}`}
        status={
          <>
            <Badge variant={quoteStatusBadgeVariant[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
            {quote.isLocked ? (
              <Badge variant="warning">Bloqueado</Badge>
            ) : null}
            {quote.status === "DRAFT" && quote.submissionKey ? (
              <Badge variant="warning">Editada</Badge>
            ) : null}
          </>
        }
        amount={formatCents(quote.totalCents)}
        customer={quote.customer?.name ?? "Sin cliente"}
        unit={unitIdentity}
        keyData={
          <>
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Icon name="clipboard" className="h-4 w-4 shrink-0" aria-hidden="true" />
              {quote.workOrder ? (
                <>
                  <span>Orden de trabajo</span>
                  <span className="min-w-0 break-all font-medium text-[var(--color-text-main)]">
                    {quote.workOrder.number}
                  </span>
                </>
              ) : (
                <span>{quote.operation === "SALE" ? "Venta de refacciones" : "Sin orden de trabajo"}</span>
              )}
            </p>

            <div data-testid="quote-dates" className="mt-3 flex min-h-12 flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-border-subtle)] pt-3">
              <p className="flex items-center gap-1.5">
                <Icon name="calendar" className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Fecha de cotización: {formatOperationalDate(quote.operationalDate)}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Icon name="calendar" className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Vigente hasta: {quote.validUntil ? formatDate(quote.validUntil) : "—"}</span>
              </p>
              {paymentDueDate ? (
                <p className="flex items-center gap-1.5">
                  <Icon name="calendar" className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Vencimiento pago: {formatDate(paymentDueDate)}</span>
                </p>
              ) : null}
            </div>
          </>
        }
        editAction={toolActions.includes("edit") ? renderAction("edit", "outline", "tile") : null}
        printAction={toolActions.includes("print") ? renderAction("print", "outline", "tile") : null}
        shareAction={toolActions.includes("share") ? renderAction("share", "outline", "tile") : null}
        overflowAction={
          <div data-testid="quote-overflow-action" className="shrink-0">
            <QuoteActionsMenu
              quoteNumber={quote.number}
              destructive={actionPresentation.destructive ? renderAction(actionPresentation.destructive) : null}
              triggerClassName="h-[var(--control-sm)] w-[var(--control-sm)] shrink-0 justify-center gap-0 px-0"
              triggerIconOnly
            >
              {overflowActions
                .filter((action) => action !== "edit" && action !== "share" && action !== "print")
                .map((action) => <React.Fragment key={action}>{renderAction(action)}</React.Fragment>)}
            </QuoteActionsMenu>
          </div>
        }
        stateAction={primary ? <div data-testid="quote-primary-action">{renderAction(primary, "tonal", "state")}</div> : null}
      />
    </>
  );
}
