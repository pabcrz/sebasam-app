"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Copy } from "lucide-react";
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

  return (
    <div
      onClick={() => setPreviewOpen(true)}
      className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
      aria-label={`Abrir vista previa de ${quote.number}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-[var(--color-text-main)]">{quote.number}</p>
          <p className="truncate text-sm text-[var(--color-text-muted)]">{quote.customer.name}</p>
        </div>
        <Badge variant={quoteStatusBadgeVariant[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
      </div>

      <p className="mt-2 text-sm font-medium text-[var(--color-text-main)]">{quote.title}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {quote.vehicle ? formatVehicle(quote.vehicle) : formatSnapshotVehicle(quote.vehicleSnapshot)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {quote.workOrder ? (
          <Badge variant={workOrderStatusBadgeVariant[quote.workOrder.status]}>
            {quote.workOrder.number} — {workOrderStatusLabels[quote.workOrder.status]}
          </Badge>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Sin orden de trabajo</span>
        )}
      </div>

      <div className="mt-3 border-t border-[var(--color-border-light)] pt-3">
        <div className="grid gap-1 text-sm">
          <p className="text-[var(--color-text-muted)]">Subtotal: {formatCents(quote.subtotalCents)}</p>
          <p className="text-[var(--color-text-muted)]">IVA: {formatCents(quote.taxCents)}</p>
          <p className="font-semibold text-[var(--color-primary)]">Total: {formatCents(quote.totalCents)}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Vigente hasta: {quote.validUntil ? formatDate(quote.validUntil) : "—"}
          </p>
        </div>
        <ul className="mt-2 grid gap-1 text-sm text-[var(--color-text-muted)]">
          {quote.items.map((item) => (
            <li key={item.id}>
              {item.description} — {Number(item.quantity).toFixed(2)} × {formatCents(item.unitPriceCents)} ={" "}
              {formatCents(item.totalCents)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-2" onClick={(event) => event.stopPropagation()}>
        <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} showTrigger={false} />
        <div className="flex gap-2">
          {editable ? (
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={`/admin/quotes/${quote.id}/edit`} aria-label={`Editar cotización ${quote.number}`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span>Editar</span>
              </Link>
            </Button>
          ) : null}
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
            size="default"
          />
        ) : null}
        {quote.status === "DRAFT" || quote.status === "SENT" || quote.status === "APPROVED" ? (
          quote.activeSharedQuote ? (
            <ShareQuoteLinkDialog sharedQuote={quote.activeSharedQuote as SharedQuote} quoteNumber={quote.number} />
          ) : (
            <ShareQuoteButton action={shareAction} quoteId={quote.id} quoteNumber={quote.number} />
          )
        ) : null}
      </div>
    </div>
  );
}
