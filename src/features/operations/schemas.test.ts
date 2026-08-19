import { describe, expect, it } from "vitest";
import { operationalWorkInputSchema } from "./schemas";

const masterId = "11111111-1111-4111-8111-111111111111";

describe("operational work schema", () => {
  it("accepts plate-only identity and normalizes the plate", () => {
    expect(operationalWorkInputSchema.parse({ masterId, plate: " abc 123 ", concepts: [{ description: "Inspection", quantity: 1 }] })).toMatchObject({ plate: "ABC 123", brand: null, model: null });
  });

  it("accepts brand and model when plate is absent", () => {
    expect(operationalWorkInputSchema.parse({ masterId, brand: " Ford ", model: " Ranger ", concepts: [{ description: "Diagnosis", quantity: 2 }] })).toMatchObject({ brand: "Ford", model: "Ranger" });
  });

  it("rejects missing unit identity and invalid concepts", () => {
    expect(() => operationalWorkInputSchema.parse({ masterId, concepts: [{ description: "Inspection", quantity: 0 }] })).toThrow();
    expect(() => operationalWorkInputSchema.parse({ masterId, plate: "", brand: "Ford", concepts: [{ description: "Inspection", quantity: 1 }] })).toThrow();
  });

  it("allows a customer-less, price-free operational concept", () => {
    const parsed = operationalWorkInputSchema.parse({ masterId, plate: "ABC123", concepts: [{ description: "Replace bushing", quantity: 1.5 }] });
    expect(parsed.customerId).toBeNull();
    expect(parsed.concepts[0]).toEqual({ description: "Replace bushing", quantity: 1.5 });
  });
});
