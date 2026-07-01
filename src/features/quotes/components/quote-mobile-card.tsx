"use client";

import * as React from "react";
import type { PaymentRequest, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import { Badge } from "@/components/ui";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { QuotePreviewDialog } from "./quote-preview-dialog";
import { QuoteApprovalForm } from "./quote-approval-form";
import { QuoteCancelForm } from "./quote-cancel-form";
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
  paymentRequestAction: () => Promise<PaymentRequest>;
}

export function QuoteMobileCard({
  quote,
  quoteStatusLabels,
  quoteStatusBadgeVariant,
  workOrderStatusLabels,
  workOrderStatusBadgeVariant,
  approveAction,
  cancelAction,
  paymentRequestAction,
}: QuoteMobileCardProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);

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
        <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} />
        {quote.status === "DRAFT" && !quote.workOrder ? (
          <>
            <QuoteApprovalForm
              action={approveAction}
              quoteId={quote.id}
              quoteNumber={quote.number}
            />
            <QuoteCancelForm action={cancelAction} quoteId={quote.id} quoteNumber={quote.number} />
          </>
        ) : quote.status === "SENT" || quote.status === "APPROVED" ? (
          <PaymentRequestLinkDialog action={paymentRequestAction} quoteNumber={quote.number} />
        ) : null}
      </div>
    </div>
  );
}
