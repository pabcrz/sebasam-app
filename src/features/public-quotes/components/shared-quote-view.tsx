"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { QuotePreviewCard } from "@/features/quotes/components/quote-preview-card";
import { formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { quoteStatusLabels } from "@/features/quotes/lib/status";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";
import type { Quote, QuoteItem, Customer, Vehicle, WorkOrderStatus, QuoteSection } from "@prisma/client";

type SerializableQuoteItem = Omit<QuoteItem, "quantity"> & {
  quantity: string;
};

export type SharedQuoteViewQuote = Quote & {
  customer: Customer;
  vehicle: Vehicle | null;
  items: SerializableQuoteItem[];
  sections: (QuoteSection & { items: SerializableQuoteItem[] })[];
  workOrder: { status: WorkOrderStatus } | null;
};

export interface SharedQuoteViewProps {
  quote: SharedQuoteViewQuote;
  token: string;
  isNote?: boolean;
}

export function SharedQuoteView({ quote, token, isNote }: SharedQuoteViewProps) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Refresh the quote data every 5 seconds if no decision has been made
    // and only if the browser tab is actually visible.
    if (decision !== null) return;
    
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [router, decision]);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = React.useState<string[]>(
    quote.sections.map((s) => s.id)
  );

  const handleSectionToggle = React.useCallback((sectionId: string, selected: boolean) => {
    setSelectedSectionIds((prev) =>
      selected ? [...prev, sectionId] : prev.filter((id) => id !== sectionId)
    );
  }, []);
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
      const result = await acceptSharedQuoteAction(token, selectedSectionIds);
      if (result.success) {
        setDecision("accepted");
      } else {
        setError(result.error ?? "No se pudo aceptar la cotización.");
      }
    });
  }, [token, selectedSectionIds]);

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

  const sections = quote.sections && quote.sections.length > 0
    ? quote.sections.map((section) => ({
        id: section.id,
        name: section.name,
        items: section.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: String(item.unitPriceCents / 100),
        })),
        rowIds: [],
      }))
    : [
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

  const showDecisionControls = (quote.status === "SENT" || quote.status === "DRAFT") && !hasDecided;

  const calculateSelectedTotals = () => {
    let subtotalCents = 0;
    const sectionsToSum = quote.sections.filter((s) => selectedSectionIds.includes(s.id));
    for (const section of sectionsToSum) {
      for (const item of section.items) {
        subtotalCents += Math.round(Number(item.quantity) * item.unitPriceCents);
      }
    }
    const taxableCents = Math.max(0, subtotalCents - Number(quote.discountCents));
    const hasTax = Number(quote.taxCents) > 0;
    const taxCents = hasTax ? Math.round(taxableCents * 0.16) : 0;
    const totalCents = taxableCents + taxCents;
    return { subtotalCents, taxCents, totalCents };
  };

  const totals = quote.sections.length > 1 && selectedSectionIds.length !== quote.sections.length
    ? calculateSelectedTotals()
    : { subtotalCents: Number(quote.subtotalCents), taxCents: Number(quote.taxCents), totalCents: Number(quote.totalCents) };
  const progressStatus = decision === "accepted" ? "accepted" : quote.status === "APPROVED"
    ? quote.workOrder?.status === "COMPLETED" ? "completed"
      : quote.workOrder?.status === "ASSIGNED" || quote.workOrder?.status === "IN_PROGRESS" ? "active" : "accepted"
    : null;

  return (
    <div className="grid gap-4 print:gap-2">

      <QuotePreviewCard
        customerName={quote.customer?.name ?? ""}
        vehicle={vehicle}
        title={quote.title ? `Cotización ${quote.number} — ${quote.title}` : `Cotización ${quote.number}`}
        description={quote.description ?? ""}
        administrative={quote.administrative}
        sections={sections}
        subtotalCents={totals.subtotalCents}
        discountCents={Number(quote.discountCents)}
        taxCents={totals.taxCents}
        totalCents={totals.totalCents}
        selectableSectionIds={showDecisionControls && quote.sections.length > 1 ? selectedSectionIds : undefined}
        onSectionToggle={showDecisionControls && quote.sections.length > 1 ? handleSectionToggle : undefined}
        validUntil={quote.validUntil}
        isNote={isNote}
        compactHeader={true}
      />

      {progressStatus ? <QuoteProgress status={progressStatus} /> : null}

      {decision === "accepted" ? (
        <div
          ref={decisionFeedbackRef}
          role="status"
          tabIndex={-1}
          className="rounded-[var(--radius-md)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] p-4 text-center print:hidden"
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
          className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4 text-center print:hidden"
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
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 sm:flex-row print:hidden">
          <Button
            variant="primary"
            size="default"
            className="flex-1"
            loading={acceptPending}
            disabled={isPending || (quote.sections.length > 0 && selectedSectionIds.length === 0)}
            onClick={handleAccept}
            aria-label="Aceptar cotización"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>
              {quote.sections.length > 0 && selectedSectionIds.length === 0
                ? "Seleccione al menos una sección"
                : selectedSectionIds.length === quote.sections.length || quote.sections.length <= 1
                  ? "Aceptar cotización"
                  : `Aceptar ${selectedSectionIds.length} seccion${selectedSectionIds.length > 1 ? "es" : ""}`}
            </span>
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

      <div className="flex justify-center mt-2 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-border-light)]/50"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir documento
        </Button>
      </div>
    </div>
  );
}

function QuoteProgress({ status }: { status: "accepted" | "active" | "completed" }) {
  const activeIndex = status === "completed" ? 2 : status === "active" ? 1 : 0;
  const stages = ["Aceptada", "Orden asignada / En proceso", "Finalizada"];
  return (
    <ol aria-label="Progreso de la cotización" className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-center text-xs print:hidden">
      {stages.map((stage, index) => (
        <li key={stage} aria-current={index === activeIndex ? "step" : undefined} className={index <= activeIndex ? "font-semibold text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"}>{stage}</li>
      ))}
    </ol>
  );
}
