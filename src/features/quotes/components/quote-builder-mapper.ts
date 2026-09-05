import type { QuoteItemType } from "@prisma/client";
import type { QuoteBuilderInitialData } from "./quote-builder-contracts";

type PersistedQuoteItem = {
  type: QuoteItemType;
  description: string;
  quantity: unknown;
  unitPriceCents: unknown;
  includeInPayroll?: boolean | null;
  customRatePercent?: number | null;
};

type PersistedQuoteForBuilder = {
  customerId: string | null;
  vehicle?: {
    plate?: string | null;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
  vehicleSnapshot?: unknown;
  title: string;
  description?: string | null;
  administrative: boolean;
  taxEnabled: boolean;
  discountCents?: unknown;
  operationalDate: Date | string;
  status: string;
  sections: ReadonlyArray<{
    name: string;
    isAuthorized?: boolean;
    items: ReadonlyArray<PersistedQuoteItem>;
  }>;
  items?: ReadonlyArray<PersistedQuoteItem>;
};

function toItemFormValue(item: PersistedQuoteItem) {
  return {
    type: item.type,
    description: item.description,
    quantity: String(Number(item.quantity)),
    unitPrice: item.unitPriceCents == null ? "" : String(Number(item.unitPriceCents) / 100),
    includeInPayroll: Boolean(item.includeInPayroll),
    customRatePercent: item.customRatePercent != null ? String(item.customRatePercent) : "40",
  };
}

function readSnapshot(snapshot: unknown) {
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>)
    : undefined;
}

export function mapPersistedQuoteToBuilderInitialData(
  quote: PersistedQuoteForBuilder,
): QuoteBuilderInitialData {
  const snapshot = readSnapshot(quote.vehicleSnapshot);
  const vehicleValue = (key: "plate" | "brand" | "model" | "year") =>
    String(quote.vehicle?.[key] ?? snapshot?.[key] ?? "");
  const sections = quote.sections.length > 0
    ? quote.sections.map((section) => ({
        name: section.name,
        isAuthorized: section.isAuthorized,
        items: section.items.map(toItemFormValue),
      }))
    : [{ name: "General", items: (quote.items ?? []).map(toItemFormValue) }];

  return {
    customerId: quote.customerId,
    vehicle: {
      plate: vehicleValue("plate"),
      brand: vehicleValue("brand"),
      model: vehicleValue("model"),
      year: vehicleValue("year"),
    },
    title: quote.title,
    description: quote.description ?? "",
    administrative: quote.administrative,
    taxEnabled: quote.taxEnabled,
    discountCents: Number(quote.discountCents ?? 0),
    operationalDate: (quote.operationalDate instanceof Date
      ? quote.operationalDate.toISOString()
      : quote.operationalDate
    ).slice(0, 10),
    isOperationalDateEditable: quote.status === "DRAFT",
    sections,
  };
}
