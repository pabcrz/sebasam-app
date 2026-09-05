import { calculateItemTotalCents, calculateQuoteTotals } from "./lib/calculate";
import type { QuoteVehicleInput } from "./schemas";
import type { VehicleInput } from "@/features/vehicles/schemas";

type QuoteItemFormInput = {
  type: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  quantity: FormDataEntryValue | null;
  unitPriceCents: FormDataEntryValue | null;
  includeInPayroll: boolean;
  customRatePercent: FormDataEntryValue | null;
};

type QuoteSectionFormInput = {
  name: FormDataEntryValue | null;
  isAuthorized: boolean;
  items: QuoteItemFormInput[];
};

export function quoteFormDataToInput(formData: FormData) {
  const sections: QuoteSectionFormInput[] = [];

  for (let sIndex = 0; true; sIndex += 1) {
    const sectionName = formData.get(`sections.${sIndex}.name`);
    const isAuthorized = formData.get(`sections.${sIndex}.isAuthorized`) === "on";
    const items: QuoteItemFormInput[] = [];

    for (let index = 0; true; index += 1) {
      const type = formData.get(`sections.${sIndex}.items.${index}.type`);
      const description = formData.get(`sections.${sIndex}.items.${index}.description`);
      const quantity = formData.get(`sections.${sIndex}.items.${index}.quantity`);
      const unitPriceCents = formData.get(`sections.${sIndex}.items.${index}.unitPrice`);
      const includeInPayrollVal = formData.get(`sections.${sIndex}.items.${index}.includeInPayroll`);
      const includeInPayroll = includeInPayrollVal === "on" || includeInPayrollVal === "true";
      const customRatePercent = formData.get(`sections.${sIndex}.items.${index}.customRatePercent`);

      if (type === null && description === null && quantity === null && unitPriceCents === null) {
        break;
      }

      const item = { type, description, quantity, unitPriceCents, includeInPayroll, customRatePercent };

      const hasAnyItemValue = [item.description, item.unitPriceCents].some(
        (value) => typeof value === "string" && value.trim() !== "",
      ) || (typeof item.quantity === "string" && item.quantity.trim() !== "1");

      if (hasAnyItemValue) {
        items.push(item);
      }
    }

    if (sectionName === null && items.length === 0) {
      break;
    }

    sections.push({ name: sectionName ?? "General", isAuthorized, items });
  }

  return {
    customerId: formData.get("customerId"),
    vehicle: {
      plate: formData.get("plate"),
      brand: formData.get("brand"),
      model: formData.get("model"),
      color: undefined,
      year: formData.get("year"),
    },
    title: String(formData.get("title") ?? ""),
    description: formData.get("description"),
    administrative: formData.get("administrative"),
    taxEnabled: formData.get("taxEnabled") === "on",
    discountCents: formData.get("discount"),
    operationalDate: formData.get("operationalDate"),
    sections,
  };
}

export function nullableOptional(value: string | undefined) {
  return value ?? null;
}

export function hasVehicleData(vehicle: QuoteVehicleInput): boolean {
  return (
    vehicle.plate !== undefined ||
    vehicle.brand !== undefined ||
    vehicle.model !== undefined ||
    vehicle.color !== undefined ||
    vehicle.year !== undefined
  );
}

export function buildVehicleInput(customerId: string | undefined, vehicle: QuoteVehicleInput): VehicleInput {
  return {
    customerId: customerId ?? "",
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
    year: vehicle.year,
    notes: undefined,
  };
}

export function draftTotals(data: {
  sections: Array<{ items: Array<{ quantity: number; unitPriceCents?: number }> }>;
  taxEnabled: boolean;
  discountCents: number;
}) {
  const hasPendingPrice = data.sections.some((section) =>
    section.items.some((item) => item.unitPriceCents === undefined),
  );
  if (hasPendingPrice) {
    return { subtotalCents: null, discountCents: data.discountCents, taxCents: null, totalCents: null };
  }

  const subtotalCents = data.sections.reduce(
    (total, section) =>
      total +
      section.items.reduce(
        (sectionTotal, item) => sectionTotal + calculateItemTotalCents(item.quantity, item.unitPriceCents!),
        0,
      ),
    0,
  );
  return calculateQuoteTotals(subtotalCents, data.taxEnabled, data.discountCents);
}
