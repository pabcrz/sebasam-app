"use client";

import { type PaymentRequest } from "@prisma/client";
import { PublicPaymentShell, PublicPaymentContent, type ShellBusinessSettings } from "./public-payment-shell";
import { BankDataCard, type BankAccountData } from "./bank-data-card";
import { ContactCard, type ContactSettings } from "./contact-card";
import { WhatsAppReceiptCta } from "./whatsapp-receipt-cta";

type PaymentRequestWithRelations = PaymentRequest & {
  customer: { id: string; name: string } | null;
  quote: {
    id: string;
    number: string;
    subtotalCents: number | null;
    taxCents: number | null;
    totalCents: number | null;
    taxEnabled: boolean;
    validUntil: Date | null;
  } | null;
  workOrder: { id: string; number: string } | null;
  customerFiscalProfile: { id: string; businessName: string; taxId: string } | null;
};

export interface PublicPaymentPageProps {
  request: PaymentRequestWithRelations;
  business?: ShellBusinessSettings;
  location?: { address?: string; mapsUrl?: string };
  bankAccounts?: BankAccountData[];
  contact?: ContactSettings;
}

function formatCurrency(cents: number | null) {
  if (cents === null) return "Pendiente";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(date);
}

export function PublicPaymentPage({
  request,
  business,
  bankAccounts,
  contact,
  location,
}: PublicPaymentPageProps) {
  const reference = request.quote?.number ?? request.workOrder?.number ?? request.id.slice(0, 8);
  const amount = request.payableTotalCents ?? request.quote?.totalCents ?? 0;
  const payableSubtotalCents = request.payableSubtotalCents ?? request.quote?.subtotalCents ?? null;
  const payableTaxCents = request.payableTaxCents ?? request.quote?.taxCents ?? null;

  return (
    <PublicPaymentShell badge="payment" business={business} location={location}>
      <div className="mb-6 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm md:p-5">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Referencia</p>
        <p className="text-lg font-bold text-[var(--color-text-main)]">{reference}</p>
        {request.quote ? (
          <div className="mt-3 grid gap-1 text-sm text-[var(--color-text-muted)]">
            <p>Subtotal: {formatCurrency(payableSubtotalCents)}</p>
            {payableTaxCents && payableTaxCents > 0 ? <p>IVA: {formatCurrency(payableTaxCents)}</p> : null}
            <p className="font-mono text-xl font-bold tabular-nums text-[var(--color-primary)]" data-numeric-role="currency">
              Total: {formatCurrency(amount)}
            </p>
            {request.quote.validUntil ? (
              <p className="text-xs">
                Vigente hasta {formatDate(request.quote.validUntil)}. Sujeta a cambios imprevistos en
                precios de materiales.
              </p>
            ) : null}
          </div>
        ) : amount > 0 ? (
          <p
            className="mt-1 font-mono text-xl font-bold tabular-nums text-[var(--color-primary)]"
            data-numeric-role="currency"
          >
            {formatCurrency(amount)}
          </p>
        ) : null}
      </div>

      <PublicPaymentContent>
        <div className="space-y-4 md:space-y-6">
          <BankDataCard bankAccounts={bankAccounts} />
          <ContactCard contact={contact} />
        </div>
        <div className="space-y-4 md:space-y-6">
          <WhatsAppReceiptCta reference={reference} />
        </div>
      </PublicPaymentContent>
    </PublicPaymentShell>
  );
}
