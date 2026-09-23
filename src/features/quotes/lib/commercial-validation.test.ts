import { describe, expect, it } from "vitest";
import { assertCommercialQuote, CommercialQuoteValidationError, isQuoteCommercialReady } from "./commercial-validation";

function quote(overrides: Partial<Parameters<typeof assertCommercialQuote>[0]> = {}) {
  return {
    customerId: "customer-1",
    subtotalCents: 10_000,
    discountCents: 0,
    taxCents: 1_600,
    totalCents: 11_600,
    taxEnabled: true,
    sections: [{ items: [{ description: "Service", quantity: 1, unitPriceCents: 10_000 }] }],
    ...overrides,
  };
}

describe("assertCommercialQuote", () => {
  it("accepts a complete quote with calculable totals", () => {
    expect(assertCommercialQuote(quote())).toEqual({
      subtotalCents: 10_000,
      discountCents: 0,
      taxCents: 1_600,
      totalCents: 11_600,
    });
  });

  it.each([
    ["missing customer", { customerId: null }],
    ["no concepts", { sections: [{ items: [] }] }],
    ["stale totals", { totalCents: 0 }],
  ])("rejects %s", (_, overrides) => {
    expect(() => assertCommercialQuote(quote(overrides))).toThrow(CommercialQuoteValidationError);
  });

  it("accepts valid pending prices and excludes them from confirmed totals", () => {
    expect(assertCommercialQuote(quote({
      sections: [{ items: [{ description: "Precio por confirmar", quantity: 1, unitPriceCents: null }] }],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    }))).toEqual({ subtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 0 });
  });

  it("calculates confirmed totals from priced concepts when another concept is pending", () => {
    expect(assertCommercialQuote(quote({
      sections: [{ items: [
        { description: "Servicio", quantity: 1, unitPriceCents: 10_000 },
        { description: "Parte por confirmar", quantity: 2, unitPriceCents: null },
      ] }],
      subtotalCents: 10_000,
      taxCents: 1_600,
      totalCents: 11_600,
    }))).toEqual({ subtotalCents: 10_000, discountCents: 0, taxCents: 1_600, totalCents: 11_600 });
  });

  it("still rejects invalid descriptions and quantities with pending prices", () => {
    expect(() => assertCommercialQuote(quote({
      sections: [{ items: [{ description: "", quantity: 1, unitPriceCents: null }] }],
    }))).toThrow(CommercialQuoteValidationError);
  });

  describe("isQuoteCommercialReady", () => {
    it("returns true for valid complete quote", () => {
      expect(isQuoteCommercialReady(quote())).toBe(true);
    });

    it("returns false for incomplete quote without throwing", () => {
      expect(isQuoteCommercialReady(quote({ customerId: null }))).toBe(false);
    });
  });
});
