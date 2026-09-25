import { calculateConfirmedQuoteTotals } from "./calculate";

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

export function assertCommercialQuote(quote: CommercialQuote, options?: { allowStaleTotals?: boolean }) {
  if (!quote.customerId) {
    throw new CommercialQuoteValidationError("Selecciona un cliente antes de preparar la cotización para compartir.");
  }

  const items = quote.sections && quote.sections.length > 0
    ? quote.sections.flatMap((section) => section.items)
    : (quote.items ?? []);
  if (items.length === 0) {
    throw new CommercialQuoteValidationError("Agrega al menos un concepto completo antes de preparar la cotización para compartir.");
  }

  if (items.some((item) => {
    const quantity = Number(item.quantity);
    return item.description.trim() === "" || !Number.isInteger(quantity) || quantity <= 0 ||
      (item.unitPriceCents !== null && (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0));
  })) {
    throw new CommercialQuoteValidationError("Completa la descripción y cantidad, y revisa los precios confirmados de todos los conceptos antes de compartir.");
  }

  const totals = calculateConfirmedQuoteTotals(items, quote.taxEnabled, quote.discountCents ?? 0);

  const hasPendingPrice = items.some((item) => item.unitPriceCents === null);
  if (!options?.allowStaleTotals && !hasPendingPrice && (quote.subtotalCents !== totals.subtotalCents || quote.taxCents !== totals.taxCents || quote.totalCents !== totals.totalCents)) {
    throw new CommercialQuoteValidationError("Revisa los precios para actualizar los totales antes de compartir.");
  }

  return totals;
}

export function isQuoteCommercialReady(quote: CommercialQuote): boolean {
  try {
    assertCommercialQuote(quote);
    return true;
  } catch {
    return false;
  }
}
