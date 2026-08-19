import type { Metadata } from "next";
import {
  getSharedQuoteByToken,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
} from "@/features/quotes/domain";
import { SharedQuoteErrorState } from "@/features/public-quotes/components/shared-quote-error-state";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
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

export const metadata: Metadata = {
  title: "Cotización",
};

interface CotizacionPageProps {
  params: Promise<{ token: string }>;
}

export default async function CotizacionPage({ params }: CotizacionPageProps) {
  const { token } = await params;
  const [result, paymentSettings] = await Promise.all([
    loadSharedQuotePageResult(token),
    getPaymentSettings(),
  ]);

  if (result.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <SharedQuoteErrorState type={result.errorType} />
      </div>
    );
  }

  const isNote = result.quote.workOrder !== null;

  return (
    <PublicQuoteShell
      business={paymentSettings}
      documentType={isNote ? "Nota" : "Cotización"}
      documentNumber={result.quote.number}
      date={result.quote.operationalDate}
      title={result.quote.title}
      customerName={result.quote.customer.name}
      vehicleDescription={
        result.quote.vehicle
          ? formatVehicle(result.quote.vehicle)
          : formatSnapshotVehicle(result.quote.vehicleSnapshot)
      }
    >
      <SharedQuoteView quote={result.quote} token={token} isNote={isNote} business={paymentSettings} />
    </PublicQuoteShell>
  );
}
