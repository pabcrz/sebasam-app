import { describe, expect, it } from "vitest";
import { assertCommercialQuote, CommercialQuoteValidationError } from "./commercial-validation";

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
    ["pending price", { sections: [{ items: [{ description: "Service", quantity: 1, unitPriceCents: null }] }] }],
    ["stale totals", { totalCents: 0 }],
  ])("rejects %s", (_, overrides) => {
    expect(() => assertCommercialQuote(quote(overrides))).toThrow(CommercialQuoteValidationError);
  });

  it("keeps a pending-price draft out of final authorization", () => {
    expect(() => assertCommercialQuote(quote({
      sections: [{ items: [{ description: "Precio por confirmar", quantity: 1, unitPriceCents: null }] }],
    }))).toThrow("Completa la descripción, cantidad y precio de todos los conceptos antes de compartir.");
  });
});
