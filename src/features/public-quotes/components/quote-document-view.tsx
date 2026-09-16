import * as React from "react";
import type { Prisma, WorkOrderStatus } from "@prisma/client";
import type { PaymentSettingsData } from "@/features/payment-settings/domain";
import { toPublicBusinessIdentity } from "@/features/public-branding/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import {
  SharedQuoteView,
  type SharedQuoteViewQuote,
} from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";
import {
  resolveDocumentFolio,
  resolveDocumentPresentation,
} from "@/features/quotes/lib/document-resolver";

export interface QuoteDocumentViewProps {
  quote: QuoteDocumentQuote;
  paymentSettings: PaymentSettingsData;
  documentType?: "Cotización" | "Nota" | "Trabajo";
  vehicleDescriptionOverride?: string;
  workOrderStatus?: WorkOrderStatus | null;
  token?: string;
  isPrint?: boolean;
  controls?: React.ReactNode;
  paymentStatus?: { paidCents: number; remainingCents: number; isSettled: boolean } | null;
}

type QuoteDocumentItem = Omit<SharedQuoteViewQuote["items"][number], "quantity" | "unitPriceCents"> & {
  quantity: Prisma.Decimal | string | number | null;
  unitPriceCents: number | bigint | null;
};

type QuoteDocumentSection = Omit<SharedQuoteViewQuote["sections"][number], "items"> & {
  items: QuoteDocumentItem[];
};

type QuoteDocumentQuote = Omit<
  SharedQuoteViewQuote,
  "discountCents" | "items" | "sections" | "subtotalCents" | "taxCents" | "totalCents" | "workOrder"
> & {
  discountCents: number | bigint | null;
  subtotalCents: number | bigint | null;
  taxCents: number | bigint | null;
  totalCents: number | bigint | null;
  items: QuoteDocumentItem[];
  sections: QuoteDocumentSection[];
  workOrder?: { status: WorkOrderStatus; folio?: string | null } | null;
  folio?: string | null;
};

function normalizeItem(item: QuoteDocumentItem) {
  return {
    ...item,
    quantity: item.quantity != null ? item.quantity.toString() : "1",
    unitPriceCents: item.unitPriceCents != null ? Number(item.unitPriceCents) : null,
  };
}

export function serializeQuoteForDocument(
  quote: QuoteDocumentQuote,
  workOrderOverride?: { status: WorkOrderStatus; folio?: string | null } | null,
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
      ? quote.sections.map((section) => ({
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
          ? { status: quote.workOrder.status, folio: quote.workOrder.folio }
          : null,
  } as SharedQuoteViewQuote;
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
  paymentStatus,
}: QuoteDocumentViewProps) {
  const resolvedWorkOrder =
    workOrderStatus !== undefined
      ? workOrderStatus
        ? { status: workOrderStatus, folio: quote.workOrder?.folio }
        : null
      : quote.workOrder
        ? { status: quote.workOrder.status, folio: quote.workOrder.folio }
        : null;

  const viewQuote = serializeQuoteForDocument(quote, resolvedWorkOrder);

  const resolvedDocumentType =
    documentType ??
    resolveDocumentPresentation({
      number: quote.number,
      folio: quote.folio,
      workOrder: resolvedWorkOrder,
    }).documentType;

  const resolvedDocumentNumber =
    resolvedDocumentType === "Cotización"
      ? (quote.folio ?? quote.number)
      : resolveDocumentFolio({
          number: quote.number,
          folio: quote.folio,
          workOrder: resolvedWorkOrder,
        });

  const { displayName: customerDisplayName, subtitle: customerSubtitle } =
    resolveCustomerDisplayIdentity(quote);

  const vehicleDescription =
    vehicleDescriptionOverride ??
    (quote.vehicle
      ? formatVehicle(quote.vehicle)
      : formatSnapshotVehicle(quote.vehicleSnapshot));
  const configuredBankAccounts = paymentSettings.bankAccounts ?? [];

  return (
    <div
      data-document-ready="true"
      className="relative min-h-screen bg-[var(--background)] flex flex-col print:min-h-0 print:w-full print:flex print:flex-col print:flex-1 print:overflow-visible"
    >
      {controls}
      <PublicQuoteShell
        business={toPublicBusinessIdentity(paymentSettings)}
        location={{ address: paymentSettings.address, mapsUrl: paymentSettings.mapsUrl }}
        documentType={resolvedDocumentType}
        documentNumber={resolvedDocumentNumber}
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
          paymentStatus={paymentStatus}
          bankAccounts={configuredBankAccounts
            .filter((account) => isPrint || account.isPubliclyShareable)
            .map(({ id, accountHolder, bankName, accountNumber, clabe, isForInvoicing }) => ({
              id,
              accountHolder,
              bankName,
              accountNumber,
              clabe,
              isForInvoicing,
            }))}
        />
      </PublicQuoteShell>
    </div>
  );
}
