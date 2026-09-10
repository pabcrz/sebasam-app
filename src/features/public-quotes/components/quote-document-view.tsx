import * as React from "react";
import type { WorkOrderStatus } from "@prisma/client";
import type { PaymentSettingsData } from "@/features/payment-settings/domain";
import { toPublicBusinessIdentity } from "@/features/public-branding/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import {
  SharedQuoteView,
  type SharedQuoteViewQuote,
} from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";

export interface QuoteDocumentViewProps {
  quote: any;
  paymentSettings: PaymentSettingsData;
  documentType?: "Cotización" | "Nota" | "Trabajo";
  vehicleDescriptionOverride?: string;
  workOrderStatus?: WorkOrderStatus | null;
  token?: string;
  isPrint?: boolean;
  controls?: React.ReactNode;
}

function normalizeItem(item: any) {
  return {
    ...item,
    quantity: item.quantity != null ? item.quantity.toString() : "1",
    unitPriceCents: item.unitPriceCents != null ? Number(item.unitPriceCents) : null,
  };
}

export function serializeQuoteForDocument(
  quote: any,
  workOrderOverride?: { status: WorkOrderStatus } | null,
): SharedQuoteViewQuote {
  return {
    ...quote,
    discountCents: quote.discountCents != null ? Number(quote.discountCents) : 0,
    subtotalCents: quote.subtotalCents != null ? Number(quote.subtotalCents) : null,
    taxCents: quote.taxCents != null ? Number(quote.taxCents) : null,
    totalCents: quote.totalCents != null ? Number(quote.totalCents) : null,
    items: Array.isArray(quote.items)
      ? quote.items.map(normalizeItem)
      : [],
    sections: Array.isArray(quote.sections)
      ? quote.sections.map((section: any) => ({
          ...section,
          items: Array.isArray(section.items)
            ? section.items.map(normalizeItem)
            : [],
        }))
      : [],
    workOrder:
      workOrderOverride !== undefined
        ? workOrderOverride
        : quote.workOrder
          ? { status: quote.workOrder.status }
          : null,
  };
}

export function QuoteDocumentView({
  quote,
  paymentSettings,
  documentType,
  vehicleDescriptionOverride,
  workOrderStatus,
  token,
  isPrint = false,
  controls,
}: QuoteDocumentViewProps) {
  const resolvedWorkOrder =
    workOrderStatus !== undefined
      ? workOrderStatus
        ? { status: workOrderStatus }
        : null
      : quote.workOrder
        ? { status: quote.workOrder.status }
        : null;

  const viewQuote = serializeQuoteForDocument(quote, resolvedWorkOrder);

  const isNote = resolvedWorkOrder?.status === "COMPLETED";
  const resolvedDocumentType =
    documentType ??
    (isNote ? "Nota" : resolvedWorkOrder ? "Trabajo" : "Cotización");

  const { displayName: customerDisplayName, subtitle: customerSubtitle } =
    resolveCustomerDisplayIdentity(quote);

  const vehicleDescription =
    vehicleDescriptionOverride ??
    (quote.vehicle
      ? formatVehicle(quote.vehicle)
      : formatSnapshotVehicle(quote.vehicleSnapshot));

  return (
    <div className="relative min-h-screen bg-[var(--background)] flex flex-col print:min-h-0 print:block print:w-full">
      {controls}
      <PublicQuoteShell
        business={toPublicBusinessIdentity(paymentSettings)}
        location={{ address: paymentSettings.address, mapsUrl: paymentSettings.mapsUrl }}
        documentType={resolvedDocumentType}
        documentNumber={quote.number}
        date={quote.operationalDate}
        title={quote.title}
        customerName={customerDisplayName}
        customerSubtitle={customerSubtitle}
        vehicleDescription={vehicleDescription}
      >
        <SharedQuoteView
          quote={viewQuote}
          token={token ?? ""}
          isNote={resolvedDocumentType === "Nota"}
          isPrint={isPrint}
          business={paymentSettings}
        />
      </PublicQuoteShell>
    </div>
  );
}
