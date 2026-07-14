"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Car, ClipboardList, Copy, Pencil } from "lucide-react";
import type { PaymentRequest, QuoteStatus, SharedQuote, WorkOrderStatus } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import { Badge, Button } from "@/components/ui";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { isQuoteEditable } from "@/features/quotes/lib/editability";
import { QuotePreviewDialog } from "./quote-preview-dialog";
import { QuoteApprovalForm } from "./quote-approval-form";
import { QuoteCancelForm } from "./quote-cancel-form";
import { ShareQuoteButton } from "./share-quote-button";
import { ShareQuoteLinkDialog } from "./share-quote-link-dialog";
import { QuoteAuthorizeForm } from "./quote-authorize-form";
import { PaymentRequestLinkDialog } from "@/features/payment-requests/components/payment-request-link-dialog";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

interface QuoteMobileCardProps {
  quote: QuoteListItem;
  quoteStatusLabels: Record<QuoteStatus, string>;
  quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info">;
  workOrderStatusLabels: Record<WorkOrderStatus, string>;
  workOrderStatusBadgeVariant: Record<WorkOrderStatus, "default" | "success" | "warning" | "danger" | "info">;
  approveAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  shareAction: (formData: FormData) => void | Promise<void>;
  authorizeAction: (note: string) => Promise<{ success: boolean; error?: string }>;
  paymentRequestAction: () => Promise<PaymentRequest>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
}

export function QuoteMobileCard({
  quote,
  quoteStatusLabels,
  quoteStatusBadgeVariant,
  workOrderStatusLabels,
  workOrderStatusBadgeVariant,
  approveAction,
  cancelAction,
  shareAction,
  authorizeAction,
  paymentRequestAction,
  duplicateAction,
}: QuoteMobileCardProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const editable = isQuoteEditable(quote);
  const openPreview = React.useCallback(() => setPreviewOpen(true), []);
  const vehicleDescription = quote.vehicle
    ? formatVehicle(quote.vehicle)
    : formatSnapshotVehicle(quote.vehicleSnapshot);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm">
      <button
        type="button"
        onClick={openPreview}
        className="block w-full cursor-pointer rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
        aria-label={`Abrir vista previa de ${quote.number}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {quote.number}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-[var(--color-text-main)]">
              {quote.customer.name}
            </p>
          </div>
          <Badge variant={quoteStatusBadgeVariant[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
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
              <Badge variant={workOrderStatusBadgeVariant[quote.workOrder.status]}>
                {workOrderStatusLabels[quote.workOrder.status]}
              </Badge>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Sin orden de trabajo
            </span>
          )}
        </div>

        <div className="mt-3 border-t border-[var(--color-border-light)] pt-3">
          <dl className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatCents(quote.subtotalCents)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
              <dt>IVA</dt>
              <dd className="tabular-nums">{formatCents(quote.taxCents)}</dd>
            </div>
            <div className="flex items-end justify-between gap-3 pt-1 text-[var(--color-primary)]">
              <dt className="font-semibold text-[var(--color-text-main)]">Total</dt>
              <dd className="text-xl font-bold tabular-nums">{formatCents(quote.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Vigente hasta: {quote.validUntil ? formatDate(quote.validUntil) : "—"}</span>
          </p>
        </div>
      </button>

      <div className="mt-4 grid gap-2">
        <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} showTrigger={false} />
        {quote.status === "DRAFT" || quote.status === "SENT" || quote.status === "APPROVED" ? (
          <div className="[&_button]:w-full [&_button]:border-[var(--color-primary)] [&_button]:text-[var(--color-primary)]">
            {quote.activeSharedQuote ? (
              <ShareQuoteLinkDialog sharedQuote={quote.activeSharedQuote as SharedQuote} quoteNumber={quote.number} />
            ) : (
              <ShareQuoteButton action={shareAction} quoteId={quote.id} quoteNumber={quote.number} />
            )}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            asChild={editable}
            variant="outline"
            size="sm"
            disabled={!editable}
            className="flex-1"
          >
            {editable ? (
              <Link href={`/admin/quotes/${quote.id}/edit`} aria-label={`Editar cotización ${quote.number}`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Editar</span>
              </Link>
            ) : (
              <>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Editar</span>
              </>
            )}
          </Button>
          <form action={duplicateAction} className={editable ? "flex-1" : ""}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <Button type="submit" variant="outline" size="sm" className="w-full">
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span>Duplicar</span>
            </Button>
          </form>
        </div>
        {quote.status === "DRAFT" && !quote.workOrder ? (
          <>
            <QuoteApprovalForm
              action={approveAction}
              quoteId={quote.id}
              quoteNumber={quote.number}
            />
            <QuoteCancelForm action={cancelAction} quoteId={quote.id} quoteNumber={quote.number} />
          </>
        ) : null}
        {quote.status === "SENT" || quote.status === "APPROVED" ? (
          <PaymentRequestLinkDialog action={paymentRequestAction} quoteNumber={quote.number} />
        ) : null}
        {quote.status === "SENT" ? (
          <QuoteAuthorizeForm
            action={authorizeAction}
            quoteNumber={quote.number}
            size="sm"
          />
        ) : null}
      </div>
    </div>
  );
}
