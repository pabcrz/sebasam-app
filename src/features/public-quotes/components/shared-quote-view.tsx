"use client";

import * as React from "react";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import { businessPaymentConfig } from "@/config/payment";
import { QuoteDocument } from "@/features/quotes/components/quote-document";
import { mapPublicQuoteToDocument } from "@/features/quotes/lib/quote-document";
import type { QuoteConceptType } from "@/features/quotes/lib/quote-concepts";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";

export type SharedQuoteViewQuote = {
  number: string;
  status: string;
  title: string;
  description: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  validUntil: Date;
  createdAt: Date;
  customer: { name: string };
  vehicle: { plate: string | null; brand: string | null; model: string | null; year: number | null } | null;
  vehicleSnapshot: unknown;
  items: Array<{
    type: QuoteConceptType;
    description: string;
    quantity: string;
    unitPriceCents: number;
    totalCents: number;
  }>;
};

export interface SharedQuoteViewProps {
  quote: SharedQuoteViewQuote;
  token: string;
}

export function SharedQuoteView({ quote, token }: SharedQuoteViewProps) {
  const [decision, setDecision] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [acceptPending, startAccept] = useTransition();
  const [declinePending, startDecline] = useTransition();
  const decisionStatusRef = React.useRef<HTMLDivElement>(null);
  const isPending = acceptPending || declinePending;
  const hasDecided = decision !== null;

  React.useEffect(() => {
    if (decision) decisionStatusRef.current?.focus();
  }, [decision]);

  const handleAccept = React.useCallback(() => {
    setError(null);
    startAccept(async () => {
      const result = await acceptSharedQuoteAction(token);
      if (result.success) {
        setDecision("accepted");
      } else {
        setError(result.error ?? "No se pudo aceptar la cotización.");
      }
    });
  }, [token]);

  const handleDecline = React.useCallback(() => {
    setError(null);
    startDecline(async () => {
      const result = await declineSharedQuoteAction(token);
      if (result.success) {
        setDecision("declined");
      } else {
        setError(result.error ?? "No se pudo declinar la cotización.");
      }
    });
  }, [token]);

  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const unit = quote.vehicle ?? {
    plate: snapshot.plate == null ? undefined : String(snapshot.plate),
    brand: snapshot.brand == null ? undefined : String(snapshot.brand),
    model: snapshot.model == null ? undefined : String(snapshot.model),
    year: snapshot.year == null ? undefined : String(snapshot.year),
  };
  const document = mapPublicQuoteToDocument({
    business: {
      name: businessPaymentConfig.name,
      legalName: businessPaymentConfig.fullName,
      address: businessPaymentConfig.address,
      phone: businessPaymentConfig.contact.phone,
    },
    folio: quote.number,
    issuedAt: quote.createdAt,
    validUntil: quote.validUntil,
    customer: quote.customer,
    unit: {
      plate: unit.plate ?? undefined,
      brand: unit.brand ?? undefined,
      model: unit.model ?? undefined,
      year: unit.year == null ? undefined : String(unit.year),
    },
    title: quote.title,
    description: quote.description,
    items: quote.items,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    conditions: ["Los precios están sujetos a cambios imprevistos en el costo de materiales."],
  });

  const showDecisionControls = quote.status === "SENT" && !hasDecided;

  return (
    <div className="grid gap-4">
      <QuoteDocument document={document} />

      {decision === "accepted" ? (
        <div ref={decisionStatusRef} role="status" tabIndex={-1} className="rounded-[var(--radius-md)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] p-4 text-center">
          <Check className="mx-auto h-8 w-8 text-[var(--color-status-success-fg)]" aria-hidden="true" />
          <p className="mt-2 font-semibold text-[var(--color-status-success-fg)]">Cotización aceptada</p>
          <p className="mt-1 text-sm text-[var(--color-status-success-fg)] opacity-80">
            Gracias por tu confirmación. El taller se comunicará contigo para coordinar los siguientes pasos.
          </p>
        </div>
      ) : decision === "declined" ? (
        <div ref={decisionStatusRef} role="status" tabIndex={-1} className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4 text-center">
          <X className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" aria-hidden="true" />
          <p className="mt-2 font-semibold text-[var(--color-text-main)]">Cotización declinada</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Has declinado esta cotización. Si cambias de opinión, contacta al taller.
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]">
          {error}
        </p>
      ) : null}

      {showDecisionControls ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 sm:flex-row">
          <Button
            variant="primary"
            size="default"
            className="flex-1"
            loading={acceptPending}
            disabled={isPending}
            onClick={handleAccept}
            aria-label="Aceptar cotización"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>Aceptar cotización</span>
          </Button>
          <Button
            variant="outline"
            size="default"
            className="flex-1"
            loading={declinePending}
            disabled={isPending}
            onClick={handleDecline}
            aria-label="Declinar cotización"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span>Declinar cotización</span>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
