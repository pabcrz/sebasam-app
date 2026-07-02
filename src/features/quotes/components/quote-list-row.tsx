"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { PaymentRequest, QuoteStatus, SharedQuote, WorkOrderStatus } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import { Badge, Button, TableCell, TableRow } from "@/components/ui";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { QuotePreviewDialog } from "./quote-preview-dialog";
import { QuoteApprovalForm } from "./quote-approval-form";
import { QuoteCancelForm } from "./quote-cancel-form";
import { ShareQuoteButton } from "./share-quote-button";
import { ShareQuoteLinkDialog } from "./share-quote-link-dialog";
import { QuoteAuthorizeForm } from "./quote-authorize-form";
import { PaymentRequestLinkDialog } from "@/features/payment-requests/components/payment-request-link-dialog";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

interface QuoteListRowProps {
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
}

export function QuoteListRow({
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
}: QuoteListRowProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false);

  return (
    <TableRow
      onClick={() => setPreviewOpen(true)}
      className="cursor-pointer"
      aria-label={`Abrir vista previa de ${quote.number}`}
    >
      <TableCell className="whitespace-nowrap">
        <div className="grid gap-1">
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
          <Badge variant={workOrderStatusBadgeVariant[quote.workOrder.status]}>
            {quote.workOrder.number} — {workOrderStatusLabels[quote.workOrder.status]}
          </Badge>
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
          <div className="flex items-center justify-between gap-3 font-semibold text-[var(--color-text-main)]">
            <dt>Total</dt>
            <dd>{formatCents(quote.totalCents)}</dd>
          </div>
        </dl>
      </TableCell>
      <TableCell>{quote.validUntil ? formatDate(quote.validUntil) : "—"}</TableCell>
      <TableCell className="min-w-[230px]" onClick={(event) => event.stopPropagation()}>
        <QuotePreviewDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} showTrigger={false} />
        <div className="grid gap-2">
          {quote.status === "DRAFT" && !quote.workOrder ? (
            <>
              <Button asChild variant="outline" size="default">
                <Link href={`/admin/quotes/${quote.id}/edit`} aria-label={`Editar cotización ${quote.number}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span>Editar</span>
                </Link>
              </Button>
              <QuoteApprovalForm
                action={approveAction}
                quoteId={quote.id}
                quoteNumber={quote.number}
                buttonLabel="Aprobar"
                buttonAriaLabel="Aprobar y crear orden de trabajo"
                variant="outline"
                size="default"
              />
              <QuoteCancelForm
                action={cancelAction}
                quoteId={quote.id}
                quoteNumber={quote.number}
                variant="outline"
                size="default"
              />
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
          ) : (
            <span className="text-sm text-[var(--color-text-muted)]">Sin acción</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
