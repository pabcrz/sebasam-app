import type { Metadata } from "next";
import {
  getSharedQuoteByToken,
  getSharedQuotePaymentStatus,
  getSharedQuoteStatusRevision,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
} from "@/features/quotes/domain";
import { SharedQuoteErrorState } from "@/features/public-quotes/components/shared-quote-error-state";
import { QuoteDocumentView } from "@/features/public-quotes/components/quote-document-view";
import type { SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { formatDocumentPdfFilename } from "@/features/quotes/lib/pdf-filename";
import {
  resolveDocumentFolio,
  resolveDocumentPresentation,
} from "@/features/quotes/lib/document-resolver";
import {
  resolveCustomerDisplayIdentity,
  resolveOptionalCustomerName,
} from "@/features/quotes/lib/quote-snapshots";
import { getPaymentSettings } from "@/features/payment-settings/domain";

type SharedQuoteErrorType = "not-found" | "expired" | "revoked";

type SharedQuotePageResult =
  | { kind: "success"; quote: SharedQuoteViewQuote; paymentStatus: Awaited<ReturnType<typeof getSharedQuotePaymentStatus>>; statusRevision: string }
  | { kind: "error"; errorType: SharedQuoteErrorType };

type SharedQuoteDomainResult = Awaited<ReturnType<typeof getSharedQuoteByToken>>["quote"];

function serializeSharedQuoteForClient(quote: SharedQuoteDomainResult): SharedQuoteViewQuote {
  return {
    id: quote.id,
    number: quote.number,
    folio: quote.folio,
    status: quote.status,
    title: quote.title,
    description: quote.description,
    vehicleSnapshot: quote.vehicleSnapshot,
    subtotalCents: quote.subtotalCents,
    discountCents: quote.discountCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    taxEnabled: quote.taxEnabled,
    validUntil: quote.validUntil,
    administrative: quote.administrative,
    operationalDate: quote.operationalDate,
    isLocked: quote.isLocked,
    paymentDueDate: quote.paymentDueDate,
    customer: quote.customer ? { name: quote.customer.name } : null,
    vehicle: quote.vehicle,
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
    workOrder: quote.workOrder,
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
    const workOrderId = sharedQuote.quote.workOrder?.status === "COMPLETED"
      ? sharedQuote.quote.workOrder.id
      : undefined;
    const paymentStatus = workOrderId ? await getSharedQuotePaymentStatus(workOrderId) : null;
    return {
      kind: "success",
      quote: serializeSharedQuoteForClient(sharedQuote.quote),
      paymentStatus,
      statusRevision: getSharedQuoteStatusRevision(sharedQuote),
    };
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
    const { documentType } = resolveDocumentPresentation(quote);
    const identity = resolveCustomerDisplayIdentity(quote);
    const customerDisplayName = identity.displayName;
    const realCustomerName = resolveOptionalCustomerName(quote);
    const vehicleDescription = quote.vehicle
      ? formatVehicle(quote.vehicle)
      : formatSnapshotVehicle(quote.vehicleSnapshot);

    const folio = resolveDocumentFolio(quote);
    const title = formatDocumentPdfFilename({
      customerName: realCustomerName,
      driverName: identity.operatorName,
      vehicle: quote.vehicle ?? quote.vehicleSnapshot,
      operationalDate: quote.operationalDate,
      folio,
    });
    const displayTitle = `${documentType} ${folio || quote.number} | SEBASAM`;
    const description = `${documentType} para ${customerDisplayName} - ${vehicleDescription}`;

    return {
      title: { absolute: title },
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
      title: { absolute: "Cotización" },
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
      paymentStatus={result.paymentStatus}
      statusRevision={result.statusRevision}
    />
  );
}
