export const DEFAULT_TAX_RATE = 0.16;
export const QUOTE_VALIDITY_DAYS = 7;

export function calculateItemTotalCents(quantity: number, unitPriceCents: number) {
  return Math.round(quantity * unitPriceCents);
}

export function calculateQuoteTaxCents(
  subtotalCents: number,
  taxEnabled: boolean,
  taxRate = DEFAULT_TAX_RATE,
) {
  return taxEnabled ? Math.round(subtotalCents * taxRate) : 0;
}

export function calculateQuoteTotals(subtotalCents: number, taxEnabled: boolean, discountCents = 0) {
  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = calculateQuoteTaxCents(taxableCents, taxEnabled);

  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

export function createQuoteValidUntil(reference = new Date()) {
  return new Date(reference.getTime() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}
