import { calculateItemTotalCents, calculateQuoteTotals } from "./calculate";

type CommercialQuote = {
  customerId: string | null;
  subtotalCents: number | null;
  discountCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  taxEnabled: boolean;
  sections?: Array<{ items: Array<QuoteItemForCommercialValidation> }>;
  items?: Array<QuoteItemForCommercialValidation>;
};

type QuoteItemForCommercialValidation = {
  description: string;
  quantity: unknown;
  unitPriceCents: number | null;
};

export class CommercialQuoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommercialQuoteValidationError";
  }
}

export function assertCommercialQuote(quote: CommercialQuote) {
  if (!quote.customerId) {
    throw new CommercialQuoteValidationError("A customer is required before commercial transition.");
  }

  const items = quote.sections?.flatMap((section) => section.items) ?? quote.items ?? [];
  if (items.length === 0) {
    throw new CommercialQuoteValidationError("At least one complete concept is required before commercial transition.");
  }

  if (items.some((item) => {
    const quantity = Number(item.quantity);
    return item.description.trim() === "" || !Number.isInteger(quantity) || quantity <= 0 || item.unitPriceCents === null || !Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0;
  })) {
    throw new CommercialQuoteValidationError("Every concept must have a valid description, quantity, and price before commercial transition.");
  }

  const subtotalCents = items.reduce(
    (total, item) => total + calculateItemTotalCents(Number(item.quantity), item.unitPriceCents!),
    0,
  );
  const totals = calculateQuoteTotals(subtotalCents, quote.taxEnabled, quote.discountCents ?? 0);

  if (quote.subtotalCents !== totals.subtotalCents || quote.taxCents !== totals.taxCents || quote.totalCents !== totals.totalCents) {
    throw new CommercialQuoteValidationError("Quote totals must be calculable and current before commercial transition.");
  }

  return totals;
}
