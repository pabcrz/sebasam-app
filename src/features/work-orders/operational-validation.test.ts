import { describe, expect, it } from "vitest";
import { assertOperationalClosureQuote, assertOperationalStartQuote } from "./operational-validation";

function quote(overrides: Record<string, unknown> = {}) {
  return {
    customerId: null,
    vehicle: null,
    vehicleSnapshot: { plate: "ABC-123", brand: "", model: "" },
    subtotalCents: 10_000,
    discountCents: 0,
    taxCents: 1_600,
    totalCents: 11_600,
    taxEnabled: true,
    sections: [{ items: [{ type: "SERVICE", description: "Service", quantity: 1, unitPriceCents: 10_000 }] }],
    ...overrides,
  };
}

describe("operational quote validation", () => {
  it("allows starting from an identifiable unit with pending prices", () => {
    expect(() => assertOperationalStartQuote(quote({
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
      sections: [{ items: [{ type: "SERVICE", description: "Diagnosis", quantity: 1, unitPriceCents: null }] }],
    }))).not.toThrow();
  });

  it("allows brand and model to identify a unit without a plate", () => {
    expect(() => assertOperationalStartQuote(quote({
      vehicleSnapshot: { plate: "", brand: "Ford", model: "F-150" },
    }))).not.toThrow();
  });

  it("rejects operational start without a customer or identifiable unit", () => {
    expect(() => assertOperationalStartQuote(quote({ vehicleSnapshot: null }))).toThrow(/cliente o identifica la unidad/i);
  });

  it.each([
    ["type", { type: "UNKNOWN", description: "Service", quantity: 1, unitPriceCents: null }],
    ["description", { type: "SERVICE", description: " ", quantity: 1, unitPriceCents: null }],
    ["quantity", { type: "SERVICE", description: "Service", quantity: 0, unitPriceCents: null }],
  ])("rejects a concept with invalid %s", (_, item) => {
    expect(() => assertOperationalStartQuote(quote({ sections: [{ items: [item] }] }))).toThrow(/tipo, descripción y cantidad/i);
  });

  it("blocks closure while a price is pending", () => {
    expect(() => assertOperationalClosureQuote(quote({
      sections: [{ items: [{ type: "SERVICE", description: "Diagnosis", quantity: 1, unitPriceCents: null }] }],
    }))).toThrow(/precios válidos/i);
  });

  it.each([
    ["customer", { customerId: "customer-1", vehicleSnapshot: null }],
    ["unit", { customerId: null, vehicleSnapshot: { plate: "ABC-123" } }],
  ])("allows closure with complete prices and a %s", (_, overrides) => {
    expect(assertOperationalClosureQuote(quote(overrides))).toEqual({
      subtotalCents: 10_000,
      discountCents: 0,
      taxCents: 1_600,
      totalCents: 11_600,
    });
  });
});
