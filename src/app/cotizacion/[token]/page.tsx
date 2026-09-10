import type { Metadata } from "next";
import {
  getSharedQuoteByToken,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
} from "@/features/quotes/domain";
import { SharedQuoteErrorState } from "@/features/public-quotes/components/shared-quote-error-state";
import { QuoteDocumentView } from "@/features/public-quotes/components/quote-document-view";
import type { SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { formatDocumentPdfFilename } from "@/features/quotes/lib/pdf-filename";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";
import { getPaymentSettings } from "@/features/payment-settings/domain";

type SharedQuoteErrorType = "not-found" | "expired" | "revoked";

type SharedQuotePageResult =
  | { kind: "success"; quote: SharedQuoteViewQuote }
  | { kind: "error"; errorType: SharedQuoteErrorType };

type SharedQuoteDomainResult = Awaited<ReturnType<typeof getSharedQuoteByToken>>["quote"];

function serializeSharedQuoteForClient(quote: SharedQuoteDomainResult): SharedQuoteViewQuote {
  return {
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
  };
}

function mapErrorToType(error: unknown): SharedQuoteErrorType {
  if (error instanceof SharedQuoteExpiredError) {
    return "expired";
  }

  if (error instanceof SharedQuoteRevokedError) {
    return "revoked";
  }

  return "not-found";
}

async function loadSharedQuotePageResult(token: string): Promise<SharedQuotePageResult> {
  try {
    const sharedQuote = await getSharedQuoteByToken(token);
    return { kind: "success", quote: serializeSharedQuoteForClient(sharedQuote.quote) };
  } catch (error) {
    return { kind: "error", errorType: mapErrorToType(error) };
  }
}

interface CotizacionPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: CotizacionPageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const sharedQuote = await getSharedQuoteByToken(token);
    const quote = sharedQuote.quote;
    const documentType = quote.workOrder?.status === "COMPLETED" ? "Nota" : quote.workOrder ? "Trabajo" : "Cotización";
    const identity = resolveCustomerDisplayIdentity(quote);
    const customerName = identity.displayName;
    const vehicleDescription = quote.vehicle
      ? formatVehicle(quote.vehicle)
      : formatSnapshotVehicle(quote.vehicleSnapshot);

    const title = formatDocumentPdfFilename({
      customerName: identity.displayName,
      vehicle: quote.vehicle ?? quote.vehicleSnapshot,
      operationalDate: quote.operationalDate,
      fallbackType: documentType,
    });
    const displayTitle = `${documentType} ${quote.number} | SEBASAM`;
    const description = `${documentType} para ${customerName} - ${vehicleDescription}`;

    return {
      title,
      description,
      openGraph: {
        title: displayTitle,
        description,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: displayTitle,
        description,
      },
    };
  } catch {
    return {
      title: "Cotización",
      description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
      openGraph: {
        title: "Cotización | SEBASAM",
        description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Cotización | SEBASAM",
        description: "Portal de clientes SEBASAM para gestión de servicios y cotizaciones.",
      },
    };
  }
}

export default async function CotizacionPage({ params }: CotizacionPageProps) {
  const { token } = await params;
  const [result, paymentSettings] = await Promise.all([
    loadSharedQuotePageResult(token),
    getPaymentSettings(),
  ]);

  if (result.kind === "error") {
    return <SharedQuoteErrorState type={result.errorType} />;
  }

  return (
    <QuoteDocumentView
      quote={result.quote}
      paymentSettings={paymentSettings}
      token={token}
    />
  );
}
