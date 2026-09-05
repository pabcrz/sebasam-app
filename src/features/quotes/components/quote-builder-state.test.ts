import { describe, expect, it } from "vitest";
import {
  initializeQuoteBuilderState,
  quoteBuilderReducer,
  selectQuoteBuilderSummary,
  serializeQuoteBuilderSnapshot,
} from "./quote-builder-state";

const date = "2026-09-05";
const initialData = {
  customerId: "customer-1",
  vehicle: { plate: "ABC-123", brand: "Ford", model: "Transit", year: "2024" },
  title: "Existing quote",
  description: "Notes",
  administrative: false,
  taxEnabled: true,
  discountCents: 1000,
  operationalDate: "2026-09-01",
  sections: [{
    name: "Front",
    items: [
      { type: "LABOR" as const, description: "Repair", quantity: "2", unitPrice: "100" },
      { type: "MATERIAL" as const, description: "Paint", quantity: "1", unitPrice: "50" },
    ],
  }, {
    name: "Rear",
    items: [{ type: "OTHER" as const, description: "Detail", quantity: "1", unitPrice: "25" }],
  }],
};

function initializedState() {
  return initializeQuoteBuilderState(initialData, date);
}

describe("QuoteBuilder state core", () => {
  it("initializes draft state with deterministic parallel row IDs", () => {
    const existing = initializedState();
    const empty = initializeQuoteBuilderState(undefined, date);

    expect(existing.sections.map((section) => section.rowIds)).toEqual([
      ["quote-item-0", "quote-item-1"],
      ["quote-item-2"],
    ]);
    expect(existing.nextItemRowId).toBe(3);
    expect(empty).toMatchObject({
      customerId: "",
      taxEnabled: true,
      discount: "",
      operationalDate: date,
      nextItemRowId: 1,
    });
    expect(empty.sections[0]?.rowIds).toEqual(["quote-item-0"]);
  });

  it("reduces scalar fields without mutating prior state", () => {
    const initial = initializedState();
    const selected = quoteBuilderReducer(initial, { type: "setCustomerId", customerId: "customer-2" });
    const titled = quoteBuilderReducer(selected, { type: "setTitle", title: "Updated quote" });
    const vehicle = quoteBuilderReducer(titled, { type: "setVehicleField", field: "model", value: "Ranger" });

    expect(initial.customerId).toBe("customer-1");
    expect(vehicle).toMatchObject({ customerId: "customer-2", title: "Updated quote" });
    expect(vehicle.vehicle.model).toBe("Ranger");
  });

  it("derives totals and dirty snapshots without internal counters", () => {
    const state = initializedState();

    expect(selectQuoteBuilderSummary(state)).toEqual({
      completeItemsCount: 3,
      subtotalCents: 27500,
      discountCents: 1000,
      taxCents: 4240,
      totalCents: 30740,
    });
    const snapshot = serializeQuoteBuilderSnapshot(state, "Acme", ["", "", ""]);
    expect(snapshot).toContain('"customerSearch":"Acme"');
    expect(snapshot).not.toContain("nextItemRowId");
  });
});
