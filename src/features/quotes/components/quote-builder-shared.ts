import { QuoteItemType } from "@prisma/client";

export type Step = "client" | "items" | "notes" | "preview";

export type ItemFormValue = {
  type: QuoteItemType;
  description: string;
  quantity: string;
  unitPrice: string;
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

export const itemTypes: QuoteItemType[] = ["LABOR", "SERVICE", "MATERIAL", "EQUIPMENT", "OTHER"];
export const maxQuantity = 100;
export const maxUnitPrice = 50_000;

/** LABOR and SERVICE concepts are capped at 5 units; others use the default max. */
export function getMaxQuantityForType(type: QuoteItemType): number {
  return type === "LABOR" || type === "SERVICE" ? 5 : maxQuantity;
}

export const itemTypeLabels: Record<QuoteItemType, string> = {
  SERVICE: "Servicio",
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  EQUIPMENT: "Equipo",
  OTHER: "Otro",
};

export const emptyItem: ItemFormValue = {
  type: "LABOR",
  description: "",
  quantity: "1",
  unitPrice: "",
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

export function validateItemValue(item: ItemFormValue, index: number): string | null {
  const description = item.description.trim();
  const quantity = item.quantity.trim();
  const unitPrice = item.unitPrice.trim();
  const hasAnyValue = description !== "" || unitPrice !== "";

  if (!hasAnyValue) {
    return null;
  }

  if (description === "") {
    return `El concepto ${index + 1} necesita una descripción.`;
  }

  if (description.length > 240) {
    return `La descripción del concepto ${index + 1} es muy larga.`;
  }

  if (quantity === "") {
    return `El concepto ${index + 1} necesita una cantidad.`;
  }

  const quantityNum = Number(quantity);
  if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
    return `La cantidad del concepto ${index + 1} debe ser mayor a 0.`;
  }

  if (quantityNum > getMaxQuantityForType(item.type)) {
    return `La cantidad del concepto ${index + 1} no puede ser mayor a ${getMaxQuantityForType(item.type)}.`;
  }

  if (!Number.isInteger(quantityNum)) {
    return `La cantidad del concepto ${index + 1} debe ser un número entero.`;
  }

  if (unitPrice === "") {
    return `El concepto ${index + 1} necesita un precio unitario.`;
  }

  const unitPriceNum = Number(unitPrice);
  if (!Number.isFinite(unitPriceNum) || unitPriceNum < 0) {
    return `El precio unitario del concepto ${index + 1} no puede ser negativo.`;
  }

  if (unitPriceNum > maxUnitPrice) {
    return `El precio unitario del concepto ${index + 1} es demasiado alto.`;
  }

  if (Math.round(quantityNum * unitPriceNum * 100) > 2_147_483_647) {
    return `El total del concepto ${index + 1} es demasiado alto.`;
  }

  return null;
}

export function isItemComplete(item: ItemFormValue): boolean {
  const description = item.description.trim();
  const quantityNum = Number(item.quantity.trim());
  const unitPriceNum = Number(item.unitPrice.trim());

  return (
    description.length > 0 &&
    Number.isFinite(quantityNum) &&
    quantityNum > 0 &&
    Number.isFinite(unitPriceNum) &&
    unitPriceNum >= 0
  );
}

export function getStepError(
  step: Step,
  state: {
    customerId: string;
    vehicle: { model: string };
    title: string;
    sections: SectionFormValue[];
  },
): string | null {
  if (step === "client") {
    if (!state.customerId) return "Selecciona un cliente.";
    return null;
  }

  if (step === "items") {
    const allItems = state.sections.flatMap((s) => s.items);
    const rowError = allItems
      .map((item, index) => validateItemValue(item, index))
      .find(Boolean);
    if (rowError) return rowError;

    return allItems.some(isItemComplete) ? null : "Ingresa al menos un concepto completo.";
  }

  if (step === "notes") {
    return state.title.trim() ? null : "Ingresa el título de la cotización.";
  }

  return null;
}
