import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getQuoteById } from "@/features/quotes/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { QuoteDocumentView } from "@/features/public-quotes/components/quote-document-view";
import { formatDocumentPdfFilename } from "@/features/quotes/lib/pdf-filename";
import { resolveDocumentFolio } from "@/features/quotes/lib/document-resolver";
import {
  resolveCustomerDisplayIdentity,
  resolveOptionalCustomerName,
} from "@/features/quotes/lib/quote-snapshots";
import { PrintControls } from "@/features/quotes/components/print-controls";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    return {
      title: { absolute: "Cotización" },
    };
  }

  const identity = resolveCustomerDisplayIdentity(quote);
  const customerName = resolveOptionalCustomerName(quote);
  const folio = resolveDocumentFolio(quote);
  const title = formatDocumentPdfFilename({
    customerName,
    driverName: identity.operatorName,
    vehicle: quote.vehicle ?? quote.vehicleSnapshot,
    operationalDate: quote.operationalDate,
    folio,
  });

  return {
    title: { absolute: title },
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

  return (
    <QuoteDocumentView
      quote={quote}
      paymentSettings={paymentSettings}
      isPrint={true}
      controls={<Suspense fallback={null}><PrintControls backLabel="Volver a cotizaciones" /></Suspense>}
    />
  );
}
