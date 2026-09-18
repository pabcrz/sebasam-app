"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { QuotePreviewCard } from "@/features/quotes/components/quote-preview-card";
import { formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";
import type { QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { BankDataCard, type BankAccountData } from "@/features/public-payment/components/bank-data-card";

type SerializableQuoteItem = {
  id: string;
  quoteId: string;
  sectionId: string | null;
  type: QuoteItemType;
  description: string;
  quantity: string;
  unitPriceCents: number | null;
  totalCents: number | null;
  sortOrder: number;
} & Record<string, unknown>;

export type SharedQuoteViewQuote = {
  id: string;
  number: string;
  folio: string | null;
  status: QuoteStatus;
  title: string;
  description: string | null;
  vehicleSnapshot: unknown;
  subtotalCents: number | null;
  discountCents: number;
  taxCents: number | null;
  totalCents: number | null;
  taxEnabled: boolean;
  validUntil: Date;
  administrative: boolean;
  operationalDate: Date;
  isLocked: boolean;
  paymentDueDate: Date | null;
  customer: ({ name: string } & Record<string, unknown>) | null;
  contactSnapshot?: unknown;
  customerContact?: { name: string; role?: string | null } | null;
  vehicle: { plate: string | null; economicNumber: string | null; brand: string | null; model: string | null } | null;
  items: SerializableQuoteItem[];
  sections: { id: string; quoteId: string; name: string; sortOrder: number; isAuthorized: boolean; items: SerializableQuoteItem[] }[];
  workOrder: { id?: string; status: WorkOrderStatus; folio?: string | null } | null;
};

export interface SharedQuoteViewProps {
  quote: SharedQuoteViewQuote;
  token: string;
  isNote?: boolean;
  isPrint?: boolean;
  business?: { contactPhone: string; contactWhatsapp: string };
  paymentStatus?: { paidCents: number; remainingCents: number; isSettled: boolean } | null;
  bankAccounts?: BankAccountData[];
  initialStatusRevision?: string;
}

function initialSelectedSectionIds(quote: SharedQuoteViewQuote) {
  // If the quote is already approved, reflect the persisted authorized sections.
  // In any other case (SENT, DRAFT, REJECTED, etc.), default to ALL sections selected so the full quote is presented.
  if (quote.status === "APPROVED") {
    const authorized = quote.sections.filter((section) => section.isAuthorized).map((section) => section.id);
    if (authorized.length > 0) return authorized;
  }
  return quote.sections.map((section) => section.id);
}

export function SharedQuoteView({ quote, token, isNote: isNoteProp, isPrint: isPrintProp, business, paymentStatus, bankAccounts, initialStatusRevision }: SharedQuoteViewProps) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<string | null>(null);
  const isPrint = isPrintProp ?? !token;
  const isNote = isNoteProp ?? (quote.workOrder?.status === "COMPLETED");

  React.useEffect(() => {
    if (!token || isPrint || isNote || quote.status !== "SENT" || decision !== null || !initialStatusRevision) return;

    let active = true;
    let controller: AbortController | null = null;

    const pollStatus = async () => {
      if (!active || document.visibilityState !== "visible") return;
      controller = new AbortController();
      try {
        const response = await fetch(`/api/cotizacion/${encodeURIComponent(token)}/status`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!active) return;
        if (!response.ok) {
          if (response.status === 404 || response.status === 410) router.refresh();
          return;
        }
        const status = await response.json() as { revision?: string };
        if (status.revision && status.revision !== initialStatusRevision) router.refresh();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    };

    const interval = setInterval(pollStatus, 60_000);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
    };
  }, [initialStatusRevision, isNote, isPrint, quote.status, router, token, decision]);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = React.useState(() => initialSelectedSectionIds(quote));

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

  const rootItems = quote.items.filter((item) => item.sectionId === null);
  const rootSection = rootItems.length > 0
    ? [{
        name: "General",
        items: rootItems.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: item.unitPriceCents == null ? "" : String(item.unitPriceCents / 100),
        })),
        rowIds: [],
      }]
    : [];
  const sectionItems = quote.sections.map((section) => ({
        id: section.id,
        name: section.name,
        isAuthorized: isPrint
          ? undefined
          : decision === "accepted"
            ? selectedSectionIds.includes(section.id)
            : section.isAuthorized,
        items: section.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: String(Number(item.quantity)),
          unitPrice: item.unitPriceCents == null ? "" : String(item.unitPriceCents / 100),
        })),
        rowIds: [],
      }));
  const sections = [...rootSection, ...sectionItems];

  const showDecisionControls = !isPrint && Boolean(token) && quote.status === "SENT" && !hasDecided && !isNote && !quote.isLocked;

  const calculateSelectedTotals = () => {
    let subtotalCents = 0;
    for (const item of quote.items) {
      if (item.sectionId !== null) continue;
      if (item.unitPriceCents != null) {
        subtotalCents += Math.round(Number(item.quantity) * Number(item.unitPriceCents));
      }
    }
    const sectionsToSum = quote.sections.filter((s) => selectedSectionIds.includes(s.id));
    for (const section of sectionsToSum) {
      for (const item of section.items) {
        if (item.unitPriceCents != null) {
          subtotalCents += Math.round(Number(item.quantity) * Number(item.unitPriceCents));
        }
      }
    }
    const taxableCents = Math.max(0, subtotalCents - Number(quote.discountCents ?? 0));
    const hasTax = Number(quote.taxCents) > 0 || quote.taxEnabled;
    const taxCents = hasTax ? Math.round(taxableCents * 0.16) : 0;
    const totalCents = taxableCents + taxCents;
    return { subtotalCents, taxCents, totalCents };
  };

  const fullTotals = React.useMemo(() => {
    let subtotalCents = 0;
    let hasPending = false;

    for (const section of quote.sections) {
      for (const item of section.items) {
        if (item.unitPriceCents == null) {
          hasPending = true;
        } else {
          subtotalCents += Math.round(Number(item.quantity) * Number(item.unitPriceCents));
        }
      }
    }
    for (const item of quote.items) {
      if (item.sectionId !== null) continue;
      if (item.unitPriceCents == null) {
        hasPending = true;
      } else {
        subtotalCents += Math.round(Number(item.quantity) * Number(item.unitPriceCents));
      }
    }

    if (hasPending) {
      return {
        subtotalCents: quote.subtotalCents == null ? null : Number(quote.subtotalCents),
        taxCents: quote.taxCents == null ? null : Number(quote.taxCents),
        totalCents: quote.totalCents == null ? null : Number(quote.totalCents),
      };
    }

    const discountCents = Number(quote.discountCents ?? 0);
    const taxableCents = Math.max(0, subtotalCents - discountCents);
    const hasTax = Number(quote.taxCents) > 0 || quote.taxEnabled;
    const taxCents = hasTax ? Math.round(taxableCents * 0.16) : 0;
    const totalCents = taxableCents + taxCents;

    return { subtotalCents, taxCents, totalCents };
  }, [quote]);

  const totals = isPrint || quote.sections.length <= 1 || selectedSectionIds.length === quote.sections.length
    ? fullTotals
    : calculateSelectedTotals();
  const progressStatus = isPrint ? null : decision === "accepted" ? "accepted" : quote.status === "APPROVED"
    ? quote.workOrder?.status === "COMPLETED" ? "completed"
      : quote.workOrder?.status === "ASSIGNED" || quote.workOrder?.status === "IN_PROGRESS" ? "active" : "accepted"
    : null;

  return (
    <div className="flex-1 flex flex-col gap-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] print:gap-2 print:pb-0 sm:pb-20 print:w-full print:flex print:flex-col print:flex-1 print:overflow-visible">

      <QuotePreviewCard
        customerName={quote.customer?.name ?? ""}
        vehicle={vehicle}
        title={quote.title || ""}
        description={quote.description ?? ""}
        administrative={quote.administrative}
        sections={sections}
        subtotalCents={totals.subtotalCents}
        discountCents={Number(quote.discountCents)}
        taxCents={totals.taxCents}
        totalCents={totals.totalCents}
        paidCents={paymentStatus?.paidCents}
        remainingCents={paymentStatus?.remainingCents}
        showPaymentStatus={isNote && paymentStatus !== null && paymentStatus !== undefined}
        selectableSectionIds={showDecisionControls && quote.sections.length > 1 ? selectedSectionIds : undefined}
        onSectionToggle={showDecisionControls && quote.sections.length > 1 ? handleSectionToggle : undefined}
        validUntil={quote.validUntil}
        paymentDueDate={quote.paymentDueDate}
        isNote={isNote}
        isPrint={isPrint}
        isApproved={quote.status === "APPROVED" || decision === "accepted"}
        compactHeader={true}
        compactItems={!isPrint}
      />

      {isNote && bankAccounts ? (
        <div data-testid="note-payment-data" className="print:order-last print:break-inside-avoid">
          <BankDataCard bankAccounts={bankAccounts} isPrint={isPrint} />
        </div>
      ) : null}

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
            Has declinado esta cotización. Si cambias de opinión, contacta al taller
            {business?.contactPhone || business?.contactWhatsapp ? (
              <span> al {business.contactPhone ? <a href={`tel:${business.contactPhone}`} className="underline hover:text-[var(--color-text-main)]">{business.contactPhone}</a> : null}{business.contactPhone && business.contactWhatsapp ? " o por WhatsApp al " : business.contactWhatsapp ? " por WhatsApp al " : ""}{business.contactWhatsapp ? <a href={`https://wa.me/52${business.contactWhatsapp}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--color-text-main)]">{business.contactWhatsapp}</a> : null}</span>
            ) : null}.
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
            className="flex-1 focus-visible:!ring-white focus-visible:!ring-offset-2 focus-visible:!ring-offset-[var(--color-primary)]"
            loading={acceptPending}
            disabled={isPending || (quote.sections.length > 0 && selectedSectionIds.length === 0)}
            onClick={handleAccept}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>
              {quote.sections.length > 0 && selectedSectionIds.length === 0
                ? "Seleccione al menos una sección"
                : selectedSectionIds.length === quote.sections.length || quote.sections.length <= 1
                  ? "Aceptar cotización"
                  : `Aceptar ${selectedSectionIds.length} sección${selectedSectionIds.length > 1 ? "es" : ""}`}
            </span>
          </Button>
          <Button
            variant="outline"
            size="default"
            className="flex-1 focus-visible:!ring-[var(--color-primary)] focus-visible:!ring-offset-2 focus-visible:!ring-offset-[var(--color-surface)]"
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

      {!isPrint ? (
        <Button
          type="button"
          variant="outline"
          size="default"
          title="Imprimir documento"
          aria-label="Imprimir documento"
          onClick={() => window.print()}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 min-h-11 min-w-11 gap-2 px-3 shadow-lg print:hidden sm:bottom-5 sm:right-5 sm:px-4"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Imprimir</span>
        </Button>
      ) : null}

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
