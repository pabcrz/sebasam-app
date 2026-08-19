import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuoteById } from "@/features/quotes/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { PrintControls } from "./print-controls";

export const metadata: Metadata = {
  title: "Imprimir PDF",
};

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotePrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const [quote, paymentSettings] = await Promise.all([
    getQuoteById(id),
    getPaymentSettings(),
  ]);

  if (!quote) {
    notFound();
  }

  // Determine if it should be called "Nota" or "Cotización"
  const documentType = quote.workOrder?.status === "COMPLETED" ? "Nota" : "Cotización";

  const viewQuote: SharedQuoteViewQuote = {
    ...quote,
    items: quote.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
    })),
    sections: quote.sections ? quote.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        quantity: item.quantity.toString(),
      })),
    })) : [],
    workOrder: quote.workOrder ? { status: quote.workOrder.status } : null,
  };

  return (
    <div className="bg-[var(--background)] min-h-screen">
      <PrintControls quoteId={quote.id} />
      <PublicQuoteShell
        business={paymentSettings}
        documentType={documentType}
        documentNumber={quote.number}
        date={quote.operationalDate}
        title={quote.title}
        customerName={quote.customer?.name ?? "Sin cliente"}
        vehicleDescription={
          quote.vehicle
            ? formatVehicle(quote.vehicle)
            : formatSnapshotVehicle(quote.vehicleSnapshot)
        }
      >
        <SharedQuoteView quote={viewQuote} token="" isNote={documentType === "Nota"} />
      </PublicQuoteShell>
    </div>
  );
}
