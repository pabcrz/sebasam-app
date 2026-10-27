import { describe, expect, it } from "vitest";
import { QuoteItemType } from "@/generated/prisma/client";
import { quoteDraftFormInputSchema, quoteFormInputSchema } from "./schemas";

const draft = {
  customerId: "",
  vehicle: { plate: "", brand: "Toyota", model: "Hilux", color: "", year: "" },
  title: "Unidad pendiente de identificar",
  description: "Observación inicial",
  taxEnabled: true,
  discountCents: "0",
  sections: [{ name: "General", items: [{ type: QuoteItemType.LABOR, description: "Revisar frenos", quantity: "1", unitPriceCents: "" }] }],
};

describe("draft quote persistence contract", () => {
  it.each(["", "   "])("accepts a draft without a customer and with pending price %j", (unitPriceCents) => {
    const parsed = quoteDraftFormInputSchema.safeParse({
      ...draft,
      sections: [{ ...draft.sections[0], items: [{ ...draft.sections[0].items[0], unitPriceCents }] }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.customerId).toBeUndefined();
      expect(parsed.data.sections[0]?.items[0]?.unitPriceCents).toBeUndefined();
    }
  });

  it.each(["not-a-price", "-0.01", "50000.01"])("rejects invalid pending-price input %j", (unitPriceCents) => {
    expect(quoteDraftFormInputSchema.safeParse({
      ...draft,
      sections: [{ ...draft.sections[0], items: [{ ...draft.sections[0].items[0], unitPriceCents }] }],
    }).success).toBe(false);
  });

  it.each([
    ["plate", { plate: "ABC-123", brand: "", model: "", color: "", year: "" }],
    ["brand and model", { plate: "", brand: "Toyota", model: "Hilux", color: "", year: "" }],
  ])("accepts a customerless draft identified by %s", (_label, vehicle) => {
    expect(quoteDraftFormInputSchema.safeParse({ ...draft, vehicle }).success).toBe(true);
  });

  it("accepts a customer without unit data", () => {
    expect(quoteDraftFormInputSchema.safeParse({
      ...draft,
      customerId: "customer-1",
      vehicle: { plate: "", brand: "", model: "", color: "", year: "" },
    }).success).toBe(true);
  });

  it("rejects a draft without a customer or identifiable unit", () => {
    const result = quoteDraftFormInputSchema.safeParse({
      ...draft,
      vehicle: { plate: "", brand: "Toyota", model: "", color: "", year: "" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Selecciona un cliente o identifica la unidad con placas o marca y modelo.",
      );
    }
  });

  it("keeps the commercial form schema strict", () => {
    expect(quoteFormInputSchema.safeParse(draft).success).toBe(false);
  });

  it.each(["", null, undefined, "0"])("accepts draft with discount %j defaulting to 0", (discountCents) => {
    const parsed = quoteDraftFormInputSchema.safeParse({
      ...draft,
      discountCents,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.discountCents).toBe(0);
    }
  });

  it("accepts draft with null or omitted FormData values for optional fields", () => {
    const parsed = quoteDraftFormInputSchema.safeParse({
      customerId: "customer-1",
      vehicle: { plate: null, brand: null, model: null, color: null, year: null },
      title: "Diagnóstico general",
      description: null,
      taxEnabled: true,
      discountCents: "",
      operationalDate: null,
      sections: [
        {
          name: "General",
          isAuthorized: false,
          items: [
            {
              type: QuoteItemType.LABOR,
              description: "Alineación",
              quantity: "1",
              unitPriceCents: "",
            },
          ],
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.discountCents).toBe(0);
      expect(parsed.data.description).toBeUndefined();
      expect(parsed.data.vehicle.plate).toBeUndefined();
      expect(parsed.data.vehicle.year).toBeUndefined();
      expect(parsed.data.operationalDate).toBeUndefined();
    }
  });
});
