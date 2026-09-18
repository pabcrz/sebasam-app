"use client";

import * as React from "react";
import {
  Dialog,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
} from "@/components/ui";
import type { QuotePreviewSummary } from "@/features/quotes/components/quote-preview-dialog";
import { CashPaymentDialog, PaymentBalanceSummary } from "@/features/payments/components/cash-payment-dialog";
import { NotePaymentHistory } from "@/features/payments/components/note-payment-history";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { formatDate } from "@/features/quotes/lib/format";
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
};

export function NotaDetailDialog({
  workOrderNumber,
  quote,
  paymentDueDate,
  noteFolio,
  customerName,
  open,
  onOpenChange,
  paymentHistory,
  paymentAction,
  correctWorkOrderAction,
  customers,
  searchCustomersAction,
}: Props) {
  const totalCents = quote.effectiveTotalCents ?? Number(quote.totalCents ?? 0);
  const paidCents = quote.paidCents ?? 0;
  const remainingCents = quote.remainingCents ?? Math.max(0, totalCents - paidCents);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogMobileContent
        data-testid="nota-detail-dialog"
        className="h-dvh min-w-0 w-screen max-h-dvh rounded-none sm:h-auto sm:max-h-[calc(100dvh_-_2rem)] sm:w-[calc(100vw_-_2rem)] sm:max-w-6xl sm:rounded-[var(--radius-md)]"
      >
        <DialogMobileHeader>
          <DialogTitle>Nota {noteFolio}</DialogTitle>
          <DialogDescription>Detalle completo de la nota {workOrderNumber}.</DialogDescription>
          <DialogMobileClose aria-label="Cerrar detalle de nota" />
        </DialogMobileHeader>
        <DialogMobileBody data-testid="nota-detail-body" padding="none" className="grid content-start gap-4">
          <section className="grid gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4" data-testid="nota-detail-summary">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Nota de remisión</p>
            <h2 className="text-xl font-bold text-[var(--color-text-main)]">{quote.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{customerName} · Folio {noteFolio}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Referencia interna: {workOrderNumber}</p>
            {paymentDueDate ? <p data-testid="note-due-date" className="text-xs text-[var(--color-text-muted)]">Fecha de vencimiento de pago: {formatDate(paymentDueDate)}.</p> : null}
          </section>
          <section className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3" data-testid="nota-detail-payment-actions">
            <div data-testid="quote-payment-balance-indicator">
              <PaymentBalanceSummary totalCents={totalCents} paidCents={paidCents} remainingCents={remainingCents} />
            </div>
            <div className="flex flex-wrap gap-2">
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
      </DialogMobileContent>
    </Dialog>
  );
}
