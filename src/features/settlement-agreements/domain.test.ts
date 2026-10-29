import { describe, expect, it } from "vitest";
import { SettlementAgreementStatus } from "@/generated/prisma/client";
import { calculateSettlementTotals, getEffectiveSettlementTotals, SettlementAgreementError } from "./domain";

const nominalWithoutTax = { subtotalCents: 50_000, taxCents: 0, totalCents: 50_000, taxEnabled: false };
const nominalWithTax = { subtotalCents: 50_000, taxCents: 8_000, totalCents: 58_000, taxEnabled: true };

describe("settlement agreement totals", () => {
  it("keeps a 500 nominal document while settling a 300 base without tax", () => {
    expect(calculateSettlementTotals(nominalWithoutTax, 30_000)).toEqual({
      subtotalCents: 30_000,
      taxCents: 0,
      totalCents: 30_000,
    });
    expect(nominalWithoutTax.totalCents).toBe(50_000);
  });

  it("uses the quote tax rate when the settlement base is taxable", () => {
    expect(calculateSettlementTotals(nominalWithTax, 30_000)).toEqual({
      subtotalCents: 30_000,
      taxCents: 4_800,
      totalCents: 34_800,
    });
  });

  it("uses active agreement totals and falls back to the nominal quote after cancellation", () => {
    const active = { id: "agreement-1", status: SettlementAgreementStatus.ACTIVE, settlementBaseCents: 30_000, settlementTaxCents: 0, settlementTotalCents: 30_000 };
    expect(getEffectiveSettlementTotals(nominalWithoutTax, active)).toMatchObject({ totalCents: 30_000, agreementId: "agreement-1" });
    expect(getEffectiveSettlementTotals(nominalWithoutTax, { ...active, status: SettlementAgreementStatus.CANCELLED })).toMatchObject({ totalCents: 50_000, agreementId: null });
  });

  it("rejects non-positive and above-nominal agreements", () => {
    expect(() => calculateSettlementTotals(nominalWithoutTax, 0)).toThrow(SettlementAgreementError);
    expect(() => calculateSettlementTotals(nominalWithoutTax, 50_001)).toThrow("no puede exceder");
  });
});
