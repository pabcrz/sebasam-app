import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQuoteById } from "@/features/quotes/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { formatDocumentPdfFilename } from "@/features/quotes/lib/pdf-filename";
import { PrintControls } from "@/features/quotes/components/print-controls";
import { Suspense } from "react";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    return {
      title: "Cotización",
    };
  }

  const documentType = quote.workOrder?.status === "COMPLETED" ? "Nota" : "Cotización";
  const title = formatDocumentPdfFilename({
    customerName: quote.customer?.name,
    vehicle: quote.vehicle ?? quote.vehicleSnapshot,
    operationalDate: quote.operationalDate,
    fallbackType: documentType,
  });

  return {
    title,
  };
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
    <div className="bg-[var(--background)] min-h-screen flex flex-col print:min-h-0">
      <Suspense fallback={null}><PrintControls backLabel="Volver a cotizaciones" /></Suspense>
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
        <SharedQuoteView quote={viewQuote} token="" isNote={documentType === "Nota"} isPrint={true} />
      </PublicQuoteShell>
    </div>
  );
}
