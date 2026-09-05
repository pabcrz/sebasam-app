import type { QuoteBuilderInitialData } from "./quote-builder-contracts";
import {
  calculateSectionsTotals,
  isItemComplete,
  makeEmptySection,
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
  | { type: "replaceSections"; sections: SectionFormValue[] };

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
  }
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
  const { nextItemRowId: _, ...persistableState } = state;
  return JSON.stringify({
    ...persistableState,
    customerSearch,
    newCustomer,
  });
}
