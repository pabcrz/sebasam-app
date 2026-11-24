import { describe, expect, it } from "vitest";
import { defaultPartsShareFor } from "./categories";
import { expenseInputSchema, partsShareSchema, pesosTextToCents } from "./schemas";

const valid = { spentAt: "2026-11-20", amountCents: 150_000, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED" };

describe("expenseInputSchema", () => {
  it("accepts a minimal expense and normalizes the optional fields to null", () => {
    expect(expenseInputSchema.parse({ ...valid, supplier: "  ", notes: "" })).toMatchObject({ supplier: null, notes: null, paymentMethod: null });
  });

  it.each([
    ["a non-existent date", { spentAt: "2026-02-31" }],
    ["a malformed date", { spentAt: "20/11/2026" }],
    ["a zero amount", { amountCents: 0 }],
    ["a negative amount", { amountCents: -5 }],
    ["a fractional amount of cents", { amountCents: 10.5 }],
    ["an unknown category", { category: "VACATIONS" }],
    ["an unknown invoice status", { invoiceStatus: "MAYBE" }],
    ["a payment method that does not exist", { paymentMethod: "CRYPTO" }],
  ])("rejects %s", (_name, override) => {
    expect(expenseInputSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("expense form data", () => {
  it("does not carry an assignment: whoever registers cannot set how the expense is split", () => {
    const parsed = expenseInputSchema.parse({ ...valid, partsSharePercent: 100 });
    expect(parsed).not.toHaveProperty("partsSharePercent");
  });
});

describe("partsShareSchema", () => {
  it.each([0, 1, 50, 100])("accepts %s", (value) => expect(partsShareSchema.safeParse(value).success).toBe(true));
  it.each([-1, 101, 12.5, Number.NaN])("rejects %s", (value) => expect(partsShareSchema.safeParse(value).success).toBe(false));
});

describe("pesosTextToCents", () => {
  it.each([["5000", 500_000], ["1234.5", 123_450], ["0.99", 99], ["10.05", 1_005]])("converts %s", (text, cents) => {
    expect(pesosTextToCents(text)).toBe(cents);
  });

  it.each(["", "abc", "-5", "1,000", "1.234", null])("rejects %s", (text) => {
    expect(pesosTextToCents(text)).toBeNaN();
  });
});

describe("defaultPartsShareFor", () => {
  it("proposes parts for purchases, half for fuel and labor for fixed costs", () => {
    expect(defaultPartsShareFor("PARTS_PURCHASE")).toBe(100);
    expect(defaultPartsShareFor("MATERIALS_PURCHASE")).toBe(100);
    expect(defaultPartsShareFor("FUEL_TRANSPORT")).toBe(50);
    for (const fixed of ["RENT", "ELECTRICITY", "WATER", "PHONE_INTERNET", "TOOLS_EQUIPMENT", "TAXES_FEES", "OTHER"] as const) {
      expect(defaultPartsShareFor(fixed)).toBe(0);
    }
  });
});
