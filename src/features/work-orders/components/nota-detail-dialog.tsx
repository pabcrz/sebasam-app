"use client";

import * as React from "react";
import {
  DialogContent,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
} from "@/components/ui";
import { DocumentPreview } from "@/components/document-preview";
import { toQuotePreviewCardProps, type QuotePreviewSummary } from "@/features/quotes/components/quote-preview-dialog";
import { toDocumentPreviewProps } from "@/features/quotes/components/document-preview-model";
import { CashPaymentDialog, PaymentBalanceSummary } from "@/features/payments/components/cash-payment-dialog";
import { NotePaymentHistory } from "@/features/payments/components/note-payment-history";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { formatDate } from "@/features/quotes/lib/format";
import { quoteStatusLabels } from "@/features/quotes/lib/status";
import type { CustomerOption } from "@/features/quotes/components/quote-builder-contracts";
import type { QuoteFormActionState } from "@/features/quotes/actions";
import type { NotePaymentHistoryItem } from "@/features/payments/lib/payment-register";

type PaymentAction = (amount: string, operationKey: string, method: string) => Promise<{
  payment: { amountCents: number };
  paidCents: number;
  remainingCents: number;
}>;

type Props = {
  workOrderId: string;
  workOrderNumber: string;
  quote: QuotePreviewSummary & {
    effectiveTotalCents?: number;
    paidCents?: number;
    remainingCents?: number;
    activePaymentId?: string | null;
    activePaymentMethod?: string | null;
    activePaymentAmountCents?: number | null;
  };
  paymentDueDate?: Date | null;
  noteFolio: string;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteReturnTo: string;
  paymentHistory?: { totalCents: number; payments: NotePaymentHistoryItem[] };
  paymentAction?: PaymentAction;
  correctWorkOrderAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  customers: CustomerOption[];
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
  shareAction: () => Promise<{ success: boolean; token?: string; error?: string }>;
};

export function NotaDetailDialog({
  workOrderId,
  workOrderNumber,
  quote,
  paymentDueDate,
  noteFolio,
  customerName,
  open,
  onOpenChange,
  noteReturnTo,
  paymentHistory,
  paymentAction,
  correctWorkOrderAction,
  customers,
  searchCustomersAction,
  shareAction,
}: Props) {
  const totalCents = quote.effectiveTotalCents ?? Number(quote.totalCents ?? 0);
  const paidCents = quote.paidCents ?? 0;
  const remainingCents = quote.remainingCents ?? Math.max(0, totalCents - paidCents);
  const documentProps = toDocumentPreviewProps(toQuotePreviewCardProps(quote), {
    typeLabel: "Nota",
    statusLabel: quote.status ? quoteStatusLabels[quote.status] : null,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet" data-testid="nota-detail-dialog">
        <DialogMobileHeader>
          <DialogTitle>Nota {noteFolio}</DialogTitle>
          <DialogDescription>{customerName} · {quote.title}</DialogDescription>
          <DialogMobileClose aria-label="Cerrar detalle de nota" />
        </DialogMobileHeader>
        <DialogMobileBody data-testid="nota-detail-body" className="grid content-start gap-4">
          <section className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]" data-testid="nota-detail-summary">
            <span>Folio {noteFolio}</span>
            <span>Referencia interna: {workOrderNumber}</span>
          </section>
          <DocumentPreview
            {...documentProps}
            validityText={null}
            dueDateText={paymentDueDate ? `Fecha de vencimiento de pago: ${formatDate(paymentDueDate)}.` : null}
          />
          <section className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3" data-testid="nota-detail-actions">
            <div data-testid="quote-payment-balance-indicator">
              <PaymentBalanceSummary totalCents={totalCents} paidCents={paidCents} remainingCents={remainingCents} />
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareQuoteButton action={shareAction} quoteNumber={noteFolio} />
                {paymentAction && remainingCents > 0 ? (
                  <CashPaymentDialog
                    action={paymentAction}
                  quoteNumber={quote.number}
                  totalCents={totalCents}
                  paidCents={paidCents}
                  remainingCents={remainingCents}
                  documentTitle={quote.title}
                  documentFolio={noteFolio}
                    customerName={customerName}
                    receiptEnabled
                    allowedMethods={["CASH", "TRANSFER"]}
                    triggerOnly
                  />
              ) : null}
              {correctWorkOrderAction ? (
                <QuoteBuilderDialog
                  customers={customers}
                  quote={quote as never}
                  quoteNumber={quote.number}
                  saveAction={correctWorkOrderAction}
                  searchCustomersAction={searchCustomersAction}
                  triggerLabel="Corregir nota"
                  triggerAriaLabel="Corregir nota"
                  triggerVariant="outline"
                  triggerSize="sm"
                />
              ) : null}
            </div>
          </section>
          <NotePaymentHistory
            title={quote.title}
            folio={noteFolio}
            customerName={customerName}
            totalCents={paymentHistory?.totalCents ?? totalCents}
           payments={paymentHistory?.payments ?? []}
          />
        </DialogMobileBody>
      </DialogContent>
    </Sheet>
  );
}
