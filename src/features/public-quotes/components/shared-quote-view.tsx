"use client";

import * as React from "react";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import { QuotePreviewCard } from "@/features/quotes/components/quote-preview-card";
import { formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { quoteStatusLabels } from "@/features/quotes/lib/status";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";
import type { Quote, QuoteItem, Customer, Vehicle } from "@prisma/client";

type SerializableQuoteItem = Omit<QuoteItem, "quantity"> & {
  quantity: string;
};

export type SharedQuoteViewQuote = Quote & {
  customer: Customer;
  vehicle: Vehicle | null;
  items: SerializableQuoteItem[];
};

export interface SharedQuoteViewProps {
  quote: SharedQuoteViewQuote;
  token: string;
}

export function SharedQuoteView({ quote, token }: SharedQuoteViewProps) {
  const [decision, setDecision] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const decisionFeedbackRef = React.useRef<HTMLDivElement>(null);
  const [acceptPending, startAccept] = useTransition();
  const [declinePending, startDecline] = useTransition();
  const isPending = acceptPending || declinePending;
  const hasDecided = decision !== null;

  React.useEffect(() => {
    if (decision) {
      decisionFeedbackRef.current?.focus();
    }
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

  const vehicleDescription = quote.vehicle
    ? formatVehicle(quote.vehicle)
    : formatSnapshotVehicle(quote.vehicleSnapshot);

  const hasVehicle = vehicleDescription !== "Sin vehículo";
  const vehicleParts = hasVehicle ? vehicleDescription.split(" — ") : [];
  const vehicle = {
    plate: vehicleParts[0] ?? "",
    brand: vehicleParts[1] ?? "",
    model: vehicleParts[2] ?? "",
    year: vehicleParts[3] ?? "",
  };

  const sections = [
    {
      name: "General",
      items: quote.items.map((item) => ({
        type: item.type,
        description: item.description,
        quantity: String(Number(item.quantity)),
        unitPrice: String(item.unitPriceCents / 100),
      })),
      rowIds: [],
    },
  ];

  const showDecisionControls = quote.status === "SENT" && !hasDecided;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--color-text-muted)]">
        <p>Folio {quote.number}</p>
        {quote.status !== "SENT" ? (
          <p className="font-medium">{quoteStatusLabels[quote.status]}</p>
        ) : null}
      </div>

      <QuotePreviewCard
        customerName={quote.customer.name}
        vehicle={vehicle}
        title={quote.title}
        description={quote.description ?? ""}
        administrative={quote.administrative}
        sections={sections}
        subtotalCents={Number(quote.subtotalCents)}
        discountCents={Number(quote.discountCents)}
        taxCents={Number(quote.taxCents)}
        totalCents={Number(quote.totalCents)}
        validUntil={quote.validUntil}
      />

      {decision === "accepted" ? (
        <div
          ref={decisionFeedbackRef}
          role="status"
          tabIndex={-1}
          className="rounded-[var(--radius-md)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] p-4 text-center"
        >
          <Check className="mx-auto h-8 w-8 text-[var(--color-status-success-fg)]" aria-hidden="true" />
          <p className="mt-2 font-semibold text-[var(--color-status-success-fg)]">Cotización aceptada</p>
          <p className="mt-1 text-sm text-[var(--color-status-success-fg)] opacity-80">
            Gracias por tu confirmación. El taller se comunicará contigo para coordinar los siguientes pasos.
          </p>
        </div>
      ) : decision === "declined" ? (
        <div
          ref={decisionFeedbackRef}
          role="status"
          tabIndex={-1}
          className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4 text-center"
        >
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
