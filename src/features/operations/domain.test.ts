import { describe, expect, it } from "vitest";
import { assertOperationalIdentity, normalizeOperationalConcepts, OperationalWorkValidationError } from "./domain";

describe("operational work domain", () => {
  it("requires exactly one unit identity alternative", () => {
    expect(() => assertOperationalIdentity({ plate: null, brand: "Ford", model: null })).toThrow(OperationalWorkValidationError);
    expect(() => assertOperationalIdentity({ plate: "ABC123", brand: null, model: null })).not.toThrow();
    expect(() => assertOperationalIdentity({ plate: null, brand: "Ford", model: "Ranger" })).not.toThrow();
  });

  it("preserves concept order and excludes price fields", () => {
    expect(normalizeOperationalConcepts([
      { description: " First ", quantity: 1 },
      { description: "Second", quantity: 2 },
    ])).toEqual([
      { description: "First", quantity: 1, sortOrder: 0 },
      { description: "Second", quantity: 2, sortOrder: 1 },
    ]);
  });
});
