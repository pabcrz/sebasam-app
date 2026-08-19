import { describe, expect, it } from "vitest";
import { QuoteItemType } from "@prisma/client";
import { quoteDraftFormInputSchema, quoteFormInputSchema } from "./schemas";

const draft = {
  customerId: "",
  vehicle: { plate: "", brand: "Toyota", model: "Hilux", color: "", year: "" },
  title: "Unidad pendiente de identificar",
  description: "Observación inicial",
  taxEnabled: true,
  discountCents: "0",
  sections: [{ name: "General", items: [{ type: QuoteItemType.SERVICE, description: "Revisar frenos", quantity: "1", unitPrice: "" }] }],
};

describe("draft quote persistence contract", () => {
  it("accepts a draft without a customer and with a pending price", () => {
    const parsed = quoteDraftFormInputSchema.safeParse(draft);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.customerId).toBeUndefined();
      expect(parsed.data.sections[0]?.items[0]?.unitPriceCents).toBeUndefined();
    }
  });

  it("keeps the commercial form schema strict", () => {
    expect(quoteFormInputSchema.safeParse(draft).success).toBe(false);
  });
});
