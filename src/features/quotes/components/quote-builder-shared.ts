import { QuoteItemType } from "@prisma/client";

export type Step = "client" | "items" | "notes" | "preview";

export type ItemFormValue = {
  type: QuoteItemType;
  description: string;
  quantity: string;
  unitPrice: string;
  includeInPayroll?: boolean;
  customRatePercent?: string;
};

export type ItemFieldErrors = {
  description: string | null;
  quantity: string | null;
  unitPrice: string | null;
  customRatePercent?: string | null;
};

export type SectionFormValue = {
  id?: string;
  name: string;
  isAuthorized?: boolean;
  items: ItemFormValue[];
  /** stable row IDs parallel to items */
  rowIds: string[];
};

export const steps: Step[] = ["client", "items", "notes", "preview"];

export const stepLabels: Record<Step, string> = {
  client: "Cliente / Unidad",
  items: "Conceptos",
  notes: "Notas",
  preview: "Revisar",
};

export const itemTypes: QuoteItemType[] = ["LABOR", "REFACCIONES", "MATERIAL", "OTHER"];
export const maxQuantity = 100;
export const maxUnitPrice = 50_000;

/** LABOR concepts are capped at 5 units; others use the default max. */
export function getMaxQuantityForType(type: QuoteItemType): number {
  return type === "LABOR" ? 5 : maxQuantity;
}

export const itemTypeLabels: Record<QuoteItemType, string> = {
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  REFACCIONES: "Refacciones",
  OTHER: "Otro",
};

export const emptyItem: ItemFormValue = {
  type: "LABOR",
  description: "",
  quantity: "1",
  unitPrice: "",
  includeInPayroll: false,
  customRatePercent: "40",
};

export const DEFAULT_SECTION_NAME = "General";

export function makeEmptySection(rowIdBase: number): SectionFormValue {
  return {
    name: DEFAULT_SECTION_NAME,
    isAuthorized: false,
    items: [{ ...emptyItem }],
    rowIds: [`quote-item-${rowIdBase}`],
  };
}

export function normalizeItems(items: ItemFormValue[]): ItemFormValue[] {
  return items.filter(
    (item) => item.description.trim() !== "" || item.unitPrice.trim() !== "" || item.quantity !== "1",
  );
}

export function normalizeSections(sections: SectionFormValue[]): SectionFormValue[] {
  return sections
    .map((section) => {
      const kept: boolean[] = section.items.map(
        (item) => normalizeItems([item]).length > 0,
      );
      return {
        ...section,
        items: section.items.filter((_, i) => kept[i]),
        rowIds: section.rowIds.filter((_, i) => kept[i]),
      };
    })
    .filter((section) => section.items.length > 0);
}

export function formatQuantity(quantity: number | string) {
  const value = typeof quantity === "string" ? Number(quantity) : quantity;

  if (!Number.isFinite(value)) {
    return String(quantity);
  }

  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(value);
}

export function calculateTotals(items: ItemFormValue[], taxEnabled: boolean, discountCents = 0) {
  let subtotalCents = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (item.description.trim() && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice >= 0) {
      subtotalCents += Math.round(quantity * unitPrice * 100);
    }
  }

  const taxableCents = Math.max(0, subtotalCents - discountCents);
  const taxCents = taxEnabled ? Math.round(taxableCents * 0.16) : 0;

  return { subtotalCents, taxCents, totalCents: taxableCents + taxCents };
}

export function calculateSectionsTotals(sections: SectionFormValue[], taxEnabled: boolean, discountCents = 0) {
  const allItems = sections.flatMap((s) => s.items);
  return calculateTotals(allItems, taxEnabled, discountCents);
}

export function validateItemFields(
  item: ItemFormValue,
  index: number,
  includeQuantityOnly = false,
  requirePrice = false,
): ItemFieldErrors {
  const description = item.description.trim();
  const quantity = item.quantity.trim();
  const unitPrice = item.unitPrice.trim();
  const hasAnyValue = description !== "" || unitPrice !== "" || (includeQuantityOnly && quantity !== "1");

  if (!hasAnyValue) {
    return { description: null, quantity: null, unitPrice: null };
  }

  const descriptionError = description === ""
    ? `El concepto ${index + 1} necesita una descripción.`
    : description.length > 240
      ? `La descripción del concepto ${index + 1} es muy larga.`
      : null;

  const quantityNum = Number(quantity);
  const quantityError = quantity === ""
    ? `El concepto ${index + 1} necesita una cantidad.`
    : !Number.isFinite(quantityNum) || quantityNum <= 0
      ? `La cantidad del concepto ${index + 1} debe ser mayor a 0.`
      : quantityNum > getMaxQuantityForType(item.type)
        ? `La cantidad del concepto ${index + 1} no puede ser mayor a ${getMaxQuantityForType(item.type)}.`
        : !Number.isInteger(quantityNum)
          ? `La cantidad del concepto ${index + 1} debe ser un número entero.`
          : null;

  const unitPriceNum = Number(unitPrice);
  const unitPriceError = !requirePrice
    ? null
    : unitPrice === ""
      ? `El concepto ${index + 1} necesita un precio unitario.`
      : !Number.isFinite(unitPriceNum) || unitPriceNum < 0
        ? `El precio unitario del concepto ${index + 1} no puede ser negativo.`
        : unitPriceNum > maxUnitPrice
          ? `El precio unitario del concepto ${index + 1} es demasiado alto.`
          : !quantityError && Math.round(quantityNum * unitPriceNum * 100) > 2_147_483_647
            ? `El total del concepto ${index + 1} es demasiado alto.`
            : null;

  const customRatePercentStr = item.customRatePercent?.trim() ?? "";
  let customRateError: string | null = null;
  if (item.type === "OTHER" && item.includeInPayroll) {
    const rateNum = Number(customRatePercentStr);
    if (customRatePercentStr === "" || !Number.isFinite(rateNum) || !Number.isInteger(rateNum) || rateNum < 1 || rateNum > 100) {
      customRateError = `El porcentaje de comisión del concepto ${index + 1} debe ser un entero entre 1 y 100.`;
    }
  }

  return {
    description: descriptionError,
    quantity: quantityError,
    unitPrice: unitPriceError,
    customRatePercent: customRateError,
  };
}

export function validateItemValue(item: ItemFormValue, index: number, requirePrice = false): string | null {
  const errors = validateItemFields(item, index, false, requirePrice);
  return errors.description ?? errors.quantity ?? (requirePrice ? errors.unitPrice : null) ?? errors.customRatePercent ?? null;
}

function isItemDraftComplete(item: ItemFormValue): boolean {
  const description = item.description.trim();
  const quantity = item.quantity.trim();
  const quantityNum = Number(quantity);

  return (
    description.length > 0 &&
    quantity !== "" &&
    Number.isFinite(quantityNum) &&
    quantityNum > 0 &&
    Number.isInteger(quantityNum) &&
    quantityNum <= getMaxQuantityForType(item.type)
  );
}

export function isItemComplete(item: ItemFormValue): boolean {
  const description = item.description.trim();
  const unitPrice = item.unitPrice.trim();
  const quantityNum = Number(item.quantity.trim());
  const unitPriceNum = Number(unitPrice);

  return (
    description.length > 0 &&
    Number.isFinite(quantityNum) &&
    quantityNum > 0 &&
    unitPrice !== "" &&
    Number.isFinite(unitPriceNum) &&
    unitPriceNum >= 0
  );
}

export function getStepError(
  step: Step,
  state: {
    customerId: string;
    vehicle: { plate: string; brand: string; model: string };
    title: string;
    sections: SectionFormValue[];
  },
  requirePrice = false,
): string | null {
  if (step === "client") {
    const hasIdentifiableUnit = Boolean(
      state.vehicle.plate.trim() || (state.vehicle.brand.trim() && state.vehicle.model.trim()),
    );
    return state.customerId || hasIdentifiableUnit
      ? null
      : "Selecciona un cliente o identifica la unidad con placas o marca y modelo.";
  }

  if (step === "items") {
    const allItems = state.sections.flatMap((s) => s.items);
    const rowError = allItems
      .map((item, index) => validateItemValue(item, index, requirePrice))
      .find(Boolean);
    if (rowError) return rowError;

    return allItems.some(requirePrice ? isItemComplete : isItemDraftComplete)
      ? null
      : "Ingresa al menos un concepto completo.";
  }

  if (step === "notes") {
    return state.title.trim() ? null : "Ingresa el título de la cotización.";
  }

  return null;
}
