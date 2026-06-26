import { describe, expect, it } from "vitest";
import {
  calculateItemTotalCents,
  calculateQuoteTaxCents,
  calculateQuoteTotals,
  createQuoteValidUntil,
  QUOTE_VALIDITY_DAYS,
} from "./calculate";

describe("calculateItemTotalCents", () => {
  it("rounds fractional cents to the nearest integer", () => {
    expect(calculateItemTotalCents(1.5, 100)).toBe(150);
    expect(calculateItemTotalCents(3.333, 100)).toBe(333);
  });
});

describe("calculateQuoteTaxCents", () => {
  it("returns 16% of the subtotal when tax is enabled", () => {
    expect(calculateQuoteTaxCents(10000, true)).toBe(1600);
    expect(calculateQuoteTaxCents(85000, true)).toBe(13600);
  });

  it("returns 0 when tax is disabled", () => {
    expect(calculateQuoteTaxCents(10000, false)).toBe(0);
  });
});

describe("calculateQuoteTotals", () => {
  it("adds tax to the subtotal when tax is enabled", () => {
    expect(calculateQuoteTotals(85000, true)).toEqual({
      subtotalCents: 85000,
      taxCents: 13600,
      totalCents: 98600,
    });
  });

  it("keeps the total equal to the subtotal when tax is disabled", () => {
    expect(calculateQuoteTotals(85000, false)).toEqual({
      subtotalCents: 85000,
      taxCents: 0,
      totalCents: 85000,
    });
  });
});

describe("createQuoteValidUntil", () => {
  it("returns a date QUOTE_VALIDITY_DAYS after the reference date", () => {
    const reference = new Date("2026-06-25T12:00:00.000Z");
    const validUntil = createQuoteValidUntil(reference);

    const expected = new Date(reference.getTime() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    expect(validUntil).toEqual(expected);
  });
});
