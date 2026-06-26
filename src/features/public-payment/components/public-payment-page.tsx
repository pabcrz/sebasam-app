"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { PaymentRequestStatus, type PaymentRequest } from "@prisma/client";
import { PublicPaymentShell, PublicPaymentContent } from "./public-payment-shell";
import { InvoiceDecision } from "./invoice-decision";
import { FiscalDataForm } from "./fiscal-data-form";
import { BankDataCard } from "./bank-data-card";
import { ContactCard } from "./contact-card";
import { WhatsAppReceiptCta } from "./whatsapp-receipt-cta";

type PaymentRequestWithRelations = PaymentRequest & {
  customer: { id: string; name: string } | null;
  quote: { id: string; number: string; totalCents: number } | null;
  workOrder: { id: string; number: string } | null;
  customerFiscalProfile: { id: string; businessName: string; taxId: string } | null;
};

export interface PublicPaymentPageProps {
  request: PaymentRequestWithRelations;
  setInvoicePreferenceAction: (requiresInvoice: boolean) => Promise<{ success: boolean; error?: string }>;
  saveFiscalDataAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

export function PublicPaymentPage({
  request,
  setInvoicePreferenceAction,
  saveFiscalDataAction,
}: PublicPaymentPageProps) {
  const reference = request.quote?.number ?? request.workOrder?.number ?? request.id.slice(0, 8);
  const amount = request.quote?.totalCents ?? 0;

  const [invoiceError, setInvoiceError] = React.useState<string | null>(null);
  const [isInvoicePreferencePending, startInvoicePreferenceTransition] = useTransition();

  const [fiscalDataState, submitFiscalData, isFiscalDataPending] = useActionState(
    async (_prevState: unknown, formData: FormData) => {
      return saveFiscalDataAction(formData);
    },
    { success: false, error: "" },
  );

  const handleInvoiceDecision = React.useCallback(
    (requiresInvoice: boolean) => {
      setInvoiceError(null);
      startInvoicePreferenceTransition(async () => {
        const result = await setInvoicePreferenceAction(requiresInvoice);
        if (!result.success && result.error) {
          setInvoiceError(result.error);
        }
      });
    },
    [setInvoicePreferenceAction],
  );

  const showPaymentData =
    request.status === PaymentRequestStatus.READY_TO_PAY ||
    (!request.requiresInvoice && request.status !== PaymentRequestStatus.FISCAL_DATA_REQUIRED);

  const showFiscalForm = request.requiresInvoice && request.status === PaymentRequestStatus.FISCAL_DATA_REQUIRED;

  const showDecision =
    request.status === PaymentRequestStatus.PENDING ||
    request.status === PaymentRequestStatus.VIEWED ||
    (!request.requiresInvoice && !showPaymentData && !showFiscalForm);

  const badge: "payment" | "invoice" | "payment-and-invoice" = showFiscalForm
    ? "invoice"
    : showPaymentData
      ? "payment"
      : "payment-and-invoice";

  return (
    <PublicPaymentShell badge={badge}>
      <div className="mb-6 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm md:p-5">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Referencia</p>
        <p className="text-lg font-bold text-[var(--color-text-main)]">{reference}</p>
        {amount > 0 ? (
          <p className="mt-1 font-mono text-xl font-bold text-[var(--color-primary)]">{formatCurrency(amount)}</p>
        ) : null}
      </div>

      {showDecision ? (
        <InvoiceDecision onDecision={handleInvoiceDecision} isPending={isInvoicePreferencePending} />
      ) : null}

      {invoiceError ? (
        <p role="alert" className="mx-auto mt-4 max-w-xl text-sm text-[var(--color-status-danger-fg)]">
          {invoiceError}
        </p>
      ) : null}

      {showFiscalForm ? (
        <div className="mx-auto max-w-xl">
          <FiscalDataForm
            action={submitFiscalData}
            isPending={isFiscalDataPending}
            serverError={fiscalDataState?.error || invoiceError}
          />
        </div>
      ) : null}

      {showPaymentData ? (
        <PublicPaymentContent>
          <div className="space-y-4 md:space-y-6">
            <BankDataCard />
            <ContactCard />
          </div>
          <div className="space-y-4 md:space-y-6">
            <WhatsAppReceiptCta reference={reference} />
          </div>
        </PublicPaymentContent>
      ) : null}
    </PublicPaymentShell>
  );
}
