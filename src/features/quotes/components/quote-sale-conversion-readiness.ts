import { isQuoteCommercialReady } from "@/features/quotes/lib/commercial-validation";

const SALE_CONVERSION_ELIGIBLE_STATUSES = new Set(["DRAFT", "SENT", "APPROVED"]);
const SALE_CONVERSION_ITEM_TYPES = new Set(["MATERIAL", "REFACCIONES"]);

type QuoteSaleConversionReadinessItem = {
  type: string;
  description: string;
  quantity: unknown;
  unitPriceCents: number | null;
};

type QuoteSaleConversionReadinessInput = {
  status: string;
  operation: string;
  customerId: string | null;
  subtotalCents: number | null;
  discountCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  taxEnabled: boolean;
  sections: Array<{ items: QuoteSaleConversionReadinessItem[] }>;
  items: QuoteSaleConversionReadinessItem[];
  workOrder: unknown | null;
  payableNote: unknown | null;
};

function getQuoteWorkItems(quote: QuoteSaleConversionReadinessInput) {
  return quote.sections.length > 0
    ? quote.sections.flatMap((section) => section.items)
    : quote.items;
}

export function isQuoteSaleConversionActionDisabled(
  quote: QuoteSaleConversionReadinessInput,
  options: { hasConvertAction: boolean },
): boolean {
  if (!SALE_CONVERSION_ELIGIBLE_STATUSES.has(quote.status)) {
    return true;
  }

  if (Boolean(quote.payableNote) && !quote.workOrder) {
    return true;
  }

  if (quote.workOrder) {
    return false;
  }

  if (quote.operation !== "SALE") {
    return true;
  }

  const saleItemsReady = getQuoteWorkItems(quote).every((item) => SALE_CONVERSION_ITEM_TYPES.has(item.type));

  return !isQuoteCommercialReady(quote) || !saleItemsReady || !options.hasConvertAction;
}
