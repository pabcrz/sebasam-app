import type { Metadata } from "next";
import {
  getSharedQuoteByToken,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
} from "@/features/quotes/domain";
import { SharedQuoteErrorState } from "@/features/public-quotes/components/shared-quote-error-state";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";

type SharedQuoteErrorType = "not-found" | "expired" | "revoked";

type SharedQuotePageResult =
  | { kind: "success"; quote: SharedQuoteViewQuote }
  | { kind: "error"; errorType: SharedQuoteErrorType };

type SharedQuoteDomainResult = Awaited<ReturnType<typeof getSharedQuoteByToken>>["quote"];

function serializeSharedQuoteForClient(quote: SharedQuoteDomainResult): SharedQuoteViewQuote {
  return {
    number: quote.number,
    status: quote.status,
    title: quote.title,
    description: quote.description,
    administrative: quote.administrative,
    taxEnabled: quote.taxEnabled,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    validUntil: quote.validUntil,
    vehicleSnapshot: quote.vehicleSnapshot,
    customer: { name: quote.customer.name },
    vehicle: quote.vehicle ? {
      plate: quote.vehicle.plate,
      brand: quote.vehicle.brand,
      model: quote.vehicle.model,
    } : null,
    items: quote.items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPriceCents: item.unitPriceCents,
    })),
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
  const result = await loadSharedQuotePageResult(token);

  if (result.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <SharedQuoteErrorState type={result.errorType} />
      </div>
    );
  }

  return (
    <PublicQuoteShell>
      <SharedQuoteView quote={result.quote} token={token} />
    </PublicQuoteShell>
  );
}
