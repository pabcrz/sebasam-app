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
      taxEnabled: false,
      discount: "",
      operationalDate: date,
      nextItemRowId: 1,
    });
    expect(empty.sections[0]?.rowIds).toEqual(["quote-item-0"]);
  });

  it("preserves the existing document tax setting", () => {
    expect(initializeQuoteBuilderState({ ...initialData, taxEnabled: false }, date).taxEnabled).toBe(false);
    expect(initializedState().taxEnabled).toBe(true);
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

describe("QuoteBuilder state operations", () => {
  it("adds, updates, duplicates, and removes items without mutating prior state", () => {
    const initial = initializedState();
    const added = quoteBuilderReducer(initial, { type: "addItem", sectionIndex: 0, itemType: "REFACCIONES" });
    const updated = quoteBuilderReducer(added, {
      type: "updateItem",
      sectionIndex: 0,
      itemIndex: 2,
      patch: { description: "Bearing", quantity: "3", unitPrice: "20" },
    });
    const duplicated = quoteBuilderReducer(updated, { type: "duplicateItem", sectionIndex: 0, itemIndex: 2 });
    const removed = quoteBuilderReducer(duplicated, { type: "removeItem", sectionIndex: 0, itemIndex: 0 });

    expect(initial.sections[0]?.items).toHaveLength(2);
    expect(added.sections[0]?.rowIds.at(-1)).toBe("quote-item-3");
    expect(duplicated.sections[0]?.items[3]).toMatchObject({ description: "Bearing", quantity: "3" });
    expect(duplicated.sections[0]?.rowIds[3]).toBe("quote-item-4");
    expect(removed.sections[0]?.items.map((item) => item.description)).toEqual(["Paint", "Bearing", "Bearing"]);
  });

  it("keeps one replacement item when the last item is removed", () => {
    const initial = initializeQuoteBuilderState(undefined, date);
    const next = quoteBuilderReducer(initial, { type: "removeItem", sectionIndex: 0, itemIndex: 0 });

    expect(next.sections[0]?.items).toEqual([{
      type: "LABOR",
      description: "",
      quantity: "1",
      unitPrice: "",
      includeInPayroll: false,
      customRatePercent: "40",
    }]);
    expect(next.sections[0]?.rowIds).toEqual(["quote-item-1"]);
    expect(next.nextItemRowId).toBe(2);
  });

  it("adds, renames, removes, and reorders sections", () => {
    const initial = initializeQuoteBuilderState(undefined, date);
    const added = quoteBuilderReducer(initial, { type: "addSection" });
    const renamed = quoteBuilderReducer(added, { type: "updateSectionName", sectionIndex: 1, name: "Rear" });
    const reordered = quoteBuilderReducer(renamed, { type: "reorderSection", oldIndex: 1, newIndex: 0 });
    const removed = quoteBuilderReducer(reordered, { type: "removeSection", sectionIndex: 1 });

    expect(added.sections[1]?.rowIds).toEqual(["quote-item-1"]);
    expect(reordered.sections.map((section) => section.name)).toEqual(["Rear", "General"]);
    expect(removed.sections.map((section) => section.name)).toEqual(["Rear"]);
  });

  it("keeps item identity aligned when reordering within a section", () => {
    const next = quoteBuilderReducer(initializedState(), {
      type: "reorderItem",
      activeSectionIndex: 0,
      activeItemIndex: 0,
      overSectionIndex: 0,
      overItemIndex: 1,
    });

    expect(next.sections[0]?.items.map((item) => item.description)).toEqual(["Paint", "Repair"]);
    expect(next.sections[0]?.rowIds).toEqual(["quote-item-1", "quote-item-0"]);
  });

  it("replaces the last source item when moving it across sections", () => {
    const next = quoteBuilderReducer(initializedState(), {
      type: "reorderItem",
      activeSectionIndex: 1,
      activeItemIndex: 0,
      overSectionIndex: 0,
      overItemIndex: 1,
    });

    expect(next.sections[0]?.items.map((item) => item.description)).toEqual(["Repair", "Detail", "Paint"]);
    expect(next.sections[0]?.rowIds).toEqual(["quote-item-0", "quote-item-2", "quote-item-1"]);
    expect(next.sections[1]?.items[0]?.description).toBe("");
    expect(next.sections[1]?.rowIds).toEqual(["quote-item-3"]);
    expect(next.nextItemRowId).toBe(4);
  });
});
