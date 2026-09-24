import { describe, expect, it } from "vitest";
import { directMaterialSaleInputSchema } from "./schemas";

const saleInput = {
  customerId: "customer-1",
  vehicle: {},
  title: "Material sale",
  description: "Counter sale",
  administrative: false,
  taxEnabled: true,
  discountCents: 0,
  sections: [{ name: "Materials", items: [{ type: "MATERIAL", description: "Brake pad", quantity: 1, unitPriceCents: 12500, includeInPayroll: false }] }],
};

describe("directMaterialSaleInputSchema", () => {
  it("accepts a commercial material sale without a master", () => {
    expect(directMaterialSaleInputSchema.parse(saleInput)).not.toHaveProperty("masterId");
  });

  it("keeps the payment due date optional and parses it when supplied", () => {
    const parsed = directMaterialSaleInputSchema.parse({ ...saleInput, paymentDueDate: "2026-09-30" });
    expect(parsed.paymentDueDate).toBeInstanceOf(Date);
  });

  it.each(["LABOR", "OTHER"] as const)("rejects %s concepts", (type) => {
    expect(() => directMaterialSaleInputSchema.parse({
      ...saleInput,
      sections: [{ name: "Materials", items: [{ ...saleInput.sections[0].items[0], type }] }],
    })).toThrow(/material o refacciones/i);
  });
});
