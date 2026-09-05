import type { QuoteItemType } from "@prisma/client";
import type { QuoteBuilderInitialData } from "./quote-builder-contracts";
import {
  calculateSectionsTotals,
  emptyItem,
  getMaxQuantityForType,
  isItemComplete,
  makeEmptySection,
  type ItemFormValue,
  type SectionFormValue,
} from "./quote-builder-shared";

export type QuoteBuilderState = {
  customerId: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  taxEnabled: boolean;
  discount: string;
  operationalDate: string;
  sections: SectionFormValue[];
  nextItemRowId: number;
};

export type QuoteBuilderAction =
  | { type: "setCustomerId"; customerId: string }
  | { type: "setVehicleField"; field: keyof QuoteBuilderState["vehicle"]; value: string }
  | { type: "setTitle"; title: string }
  | { type: "setDescription"; description: string }
  | { type: "setAdministrative"; administrative: boolean }
  | { type: "setTaxEnabled"; taxEnabled: boolean }
  | { type: "setDiscount"; discount: string }
  | { type: "setOperationalDate"; operationalDate: string }
  | { type: "replaceSections"; sections: SectionFormValue[] }
  | { type: "addSection" }
  | { type: "removeSection"; sectionIndex: number }
  | { type: "updateSectionName"; sectionIndex: number; name: string }
  | { type: "reorderSection"; oldIndex: number; newIndex: number }
  | { type: "addItem"; sectionIndex: number; itemType: QuoteItemType }
  | { type: "removeItem"; sectionIndex: number; itemIndex: number }
  | { type: "duplicateItem"; sectionIndex: number; itemIndex: number }
  | { type: "updateItem"; sectionIndex: number; itemIndex: number; patch: Partial<ItemFormValue> }
  | { type: "adjustItemQuantity"; sectionIndex: number; itemIndex: number; delta: number }
  | { type: "reorderItem"; activeSectionIndex: number; activeItemIndex: number; overSectionIndex: number; overItemIndex: number };

export type QuoteBuilderItemsAction = Extract<
  QuoteBuilderAction,
  { type: "addSection" | "removeSection" | "updateSectionName" | "reorderSection" | "addItem" | "removeItem" | "duplicateItem" | "updateItem" | "adjustItemQuantity" | "reorderItem" | "setTaxEnabled" | "setDiscount" }
>;

export function initializeQuoteBuilderState(
  initialData: QuoteBuilderInitialData | undefined,
  defaultOperationalDate: string,
): QuoteBuilderState {
  let nextItemRowId = 0;
  const sections = initialData?.sections.length
    ? initialData.sections.map((section) => ({
        name: section.name,
        isAuthorized: section.isAuthorized ?? false,
        items: section.items.map((item) => ({ ...item })),
        rowIds: section.items.map(() => `quote-item-${nextItemRowId++}`),
      }))
    : [makeEmptySection(nextItemRowId++)];

  return {
    customerId: initialData?.customerId ?? "",
    vehicle: initialData?.vehicle ?? { plate: "", brand: "", model: "", year: "" },
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    administrative: initialData?.administrative ?? false,
    taxEnabled: initialData?.taxEnabled ?? true,
    discount: initialData?.discountCents ? String(initialData.discountCents / 100) : "",
    operationalDate: initialData?.operationalDate ?? defaultOperationalDate,
    sections,
    nextItemRowId,
  };
}

function updateSection(
  state: QuoteBuilderState,
  sectionIndex: number,
  update: (section: SectionFormValue) => SectionFormValue,
) {
  const section = state.sections[sectionIndex];
  if (!section) return state;
  const sections = [...state.sections];
  sections[sectionIndex] = update(section);
  return { ...state, sections };
}

export function quoteBuilderReducer(
  state: QuoteBuilderState,
  action: QuoteBuilderAction,
): QuoteBuilderState {
  switch (action.type) {
    case "setCustomerId":
      return { ...state, customerId: action.customerId };
    case "setVehicleField":
      return { ...state, vehicle: { ...state.vehicle, [action.field]: action.value } };
    case "setTitle":
      return { ...state, title: action.title };
    case "setDescription":
      return { ...state, description: action.description };
    case "setAdministrative":
      return { ...state, administrative: action.administrative };
    case "setTaxEnabled":
      return { ...state, taxEnabled: action.taxEnabled };
    case "setDiscount":
      return { ...state, discount: action.discount };
    case "setOperationalDate":
      return { ...state, operationalDate: action.operationalDate };
    case "replaceSections":
      return { ...state, sections: action.sections };
    case "addSection": {
      const rowId = `quote-item-${state.nextItemRowId}`;
      return {
        ...state,
        sections: [...state.sections, {
          name: "Nueva sección",
          isAuthorized: false,
          items: [{ ...emptyItem }],
          rowIds: [rowId],
        }],
        nextItemRowId: state.nextItemRowId + 1,
      };
    }
    case "removeSection":
      return { ...state, sections: state.sections.filter((_, index) => index !== action.sectionIndex) };
    case "updateSectionName":
      return updateSection(state, action.sectionIndex, (section) => ({ ...section, name: action.name }));
    case "reorderSection": {
      const sections = [...state.sections];
      const [moved] = sections.splice(action.oldIndex, 1);
      if (!moved) return state;
      sections.splice(action.newIndex, 0, moved);
      return { ...state, sections };
    }
    case "addItem": {
      const rowId = `quote-item-${state.nextItemRowId}`;
      const next = updateSection(state, action.sectionIndex, (section) => ({
        ...section,
        items: [...section.items, { ...emptyItem, type: action.itemType }],
        rowIds: [...section.rowIds, rowId],
      }));
      return next === state ? state : { ...next, nextItemRowId: state.nextItemRowId + 1 };
    }
    case "removeItem": {
      let createdReplacement = false;
      const next = updateSection(state, action.sectionIndex, (section) => {
        const items = section.items.filter((_, index) => index !== action.itemIndex);
        const rowIds = section.rowIds.filter((_, index) => index !== action.itemIndex);
        if (items.length > 0) return { ...section, items, rowIds };
        createdReplacement = true;
        return { ...section, items: [{ ...emptyItem }], rowIds: [`quote-item-${state.nextItemRowId}`] };
      });
      return createdReplacement ? { ...next, nextItemRowId: state.nextItemRowId + 1 } : next;
    }
    case "duplicateItem": {
      const rowId = `quote-item-${state.nextItemRowId}`;
      const next = updateSection(state, action.sectionIndex, (section) => {
        const source = section.items[action.itemIndex];
        if (!source) return section;
        const items = [...section.items];
        items.splice(action.itemIndex + 1, 0, {
          type: source.type,
          description: source.description,
          quantity: source.quantity,
          unitPrice: source.unitPrice,
        });
        const rowIds = [...section.rowIds];
        rowIds.splice(action.itemIndex + 1, 0, rowId);
        return { ...section, items, rowIds };
      });
      return next === state || next.sections[action.sectionIndex] === state.sections[action.sectionIndex]
        ? state
        : { ...next, nextItemRowId: state.nextItemRowId + 1 };
    }
    case "updateItem":
      return updateSection(state, action.sectionIndex, (section) => {
        const item = section.items[action.itemIndex];
        if (!item) return section;
        const items = [...section.items];
        items[action.itemIndex] = { ...item, ...action.patch };
        return { ...section, items };
      });
    case "adjustItemQuantity":
      return updateSection(state, action.sectionIndex, (section) => {
        const item = section.items[action.itemIndex];
        if (!item) return section;
        const currentQuantity = Number(item.quantity);
        const baseQuantity = Number.isFinite(currentQuantity) ? currentQuantity : 0;
        const quantity = String(Math.min(getMaxQuantityForType(item.type), Math.max(1, baseQuantity + action.delta)));
        const items = [...section.items];
        items[action.itemIndex] = { ...item, quantity };
        return { ...section, items };
      });
    case "reorderItem": {
      const { activeSectionIndex, activeItemIndex, overSectionIndex, overItemIndex } = action;
      const activeSection = state.sections[activeSectionIndex];
      const overSection = state.sections[overSectionIndex];
      if (!activeSection || !overSection) return state;
      const sections = [...state.sections];
      if (activeSectionIndex === overSectionIndex) {
        const items = [...activeSection.items];
        const rowIds = [...activeSection.rowIds];
        const [item] = items.splice(activeItemIndex, 1);
        const [rowId] = rowIds.splice(activeItemIndex, 1);
        if (!item || !rowId) return state;
        items.splice(overItemIndex, 0, item);
        rowIds.splice(overItemIndex, 0, rowId);
        sections[activeSectionIndex] = { ...activeSection, items, rowIds };
        return { ...state, sections };
      }
      const activeItems = [...activeSection.items];
      const activeRowIds = [...activeSection.rowIds];
      const [item] = activeItems.splice(activeItemIndex, 1);
      const [rowId] = activeRowIds.splice(activeItemIndex, 1);
      if (!item || !rowId) return state;
      const overItems = [...overSection.items];
      const overRowIds = [...overSection.rowIds];
      overItems.splice(overItemIndex, 0, item);
      overRowIds.splice(overItemIndex, 0, rowId);
      let nextItemRowId = state.nextItemRowId;
      if (activeItems.length === 0) {
        activeItems.push({ ...emptyItem });
        activeRowIds.push(`quote-item-${nextItemRowId++}`);
      }
      sections[activeSectionIndex] = { ...activeSection, items: activeItems, rowIds: activeRowIds };
      sections[overSectionIndex] = { ...overSection, items: overItems, rowIds: overRowIds };
      return { ...state, sections, nextItemRowId };
    }
  }
}

export function selectNextItemRowId(state: QuoteBuilderState) {
  return `quote-item-${state.nextItemRowId}`;
}

export function selectQuoteBuilderSummary(state: QuoteBuilderState) {
  const discountCents = state.discount.trim()
    ? Math.round(Number(state.discount.trim()) * 100)
    : 0;
  return {
    completeItemsCount: state.sections.flatMap((section) => section.items).filter(isItemComplete).length,
    discountCents,
    ...calculateSectionsTotals(state.sections, state.taxEnabled, discountCents),
  };
}

export function serializeQuoteBuilderSnapshot(
  state: QuoteBuilderState,
  customerSearch: string,
  newCustomer: readonly [string, string, string],
) {
  const persistableState: Partial<QuoteBuilderState> = { ...state };
  delete persistableState.nextItemRowId;
  return JSON.stringify({
    ...persistableState,
    customerSearch,
    newCustomer,
  });
}
