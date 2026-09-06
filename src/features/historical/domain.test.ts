import { describe, expect, it } from "vitest";
import { QuoteItemType } from "@prisma/client";
import {
  buildItemEmbeddingText,
  computeHistoricalCommissionCents,
  computeItemContentHash,
  computeUnitPriceCents,
  detectKit,
  hasQuantityConcept,
  isPayrollConcept,
  normalizeHistoricalItem,
  pesosToCents,
  resolveRatePercent,
} from "./domain";
import { finalizeHistoricalItem } from "./domain";

describe("historical domain - money and quantity", () => {
  it("converts pesos line totals to integer cents", () => {
    expect(pesosToCents(1200)).toBe(120000);
    expect(pesosToCents(200)).toBe(20000);
    expect(pesosToCents(1200.5)).toBe(120050);
    expect(pesosToCents(0)).toBe(0);
  });

  it("classifies payroll vs quantity concepts exactly", () => {
    expect(isPayrollConcept(QuoteItemType.LABOR, false)).toBe(true);
    expect(isPayrollConcept(QuoteItemType.LABOR, true)).toBe(true);
    expect(isPayrollConcept(QuoteItemType.OTHER, true)).toBe(true);
    expect(isPayrollConcept(QuoteItemType.OTHER, false)).toBe(false);
    expect(isPayrollConcept(QuoteItemType.MATERIAL, false)).toBe(false);
    expect(isPayrollConcept(QuoteItemType.REFACCIONES, false)).toBe(false);

    expect(hasQuantityConcept(QuoteItemType.LABOR, false)).toBe(false);
    expect(hasQuantityConcept(QuoteItemType.OTHER, true)).toBe(false);
    expect(hasQuantityConcept(QuoteItemType.REFACCIONES, false)).toBe(true);
    expect(hasQuantityConcept(QuoteItemType.MATERIAL, false)).toBe(true);
    expect(hasQuantityConcept(QuoteItemType.OTHER, false)).toBe(true);
  });

  it("detects kits from the description or the flag", () => {
    expect(detectKit("Kit de pernos de dirección", false)).toBe(true);
    expect(detectKit("kit pernos", false)).toBe(true);
    expect(detectKit("Pernos de dirección", true)).toBe(true);
    expect(detectKit("Pernos de dirección", false)).toBe(false);
  });
});

describe("historical domain - rates and derived values", () => {
  it("derives 50 for general labor and 40 for welding from the description", () => {
    expect(resolveRatePercent(QuoteItemType.LABOR, "Cambiar bujes", false, null)).toBe(50);
    expect(resolveRatePercent(QuoteItemType.LABOR, "Soldadura de percha", false, null)).toBe(40);
    expect(resolveRatePercent(QuoteItemType.LABOR, "Corte con soplete", false, null)).toBe(40);
  });

  it("allows an explicit rate override and ignores rates for parts", () => {
    expect(resolveRatePercent(QuoteItemType.LABOR, "Cambiar bujes", false, 60)).toBe(60);
    expect(resolveRatePercent(QuoteItemType.OTHER, "Ajuste", true, null)).toBe(50);
    expect(resolveRatePercent(QuoteItemType.REFACCIONES, "4 tornillos", false, null)).toBeNull();
    expect(resolveRatePercent(QuoteItemType.MATERIAL, "Aceite", false, 30)).toBeNull();
  });

  it("computes the real per-piece unit price for parts", () => {
    // 4 tornillos, line total $200.00 → $50.00 per piece
    expect(computeUnitPriceCents(QuoteItemType.REFACCIONES, 4, 20000, false)).toBe(5000);
    expect(computeUnitPriceCents(QuoteItemType.MATERIAL, 2, 85000, false)).toBe(42500);
  });

  it("never divides kits: unit price is the line total", () => {
    expect(computeUnitPriceCents(QuoteItemType.REFACCIONES, 1, 85000, true)).toBe(85000);
    expect(computeUnitPriceCents(QuoteItemType.REFACCIONES, 4, 85000, true)).toBe(85000);
  });

  it("returns null unit price for labor and missing inputs", () => {
    expect(computeUnitPriceCents(QuoteItemType.LABOR, null, 120000, false)).toBeNull();
    expect(computeUnitPriceCents(QuoteItemType.REFACCIONES, 0, 20000, false)).toBeNull();
    expect(computeUnitPriceCents(QuoteItemType.REFACCIONES, 4, null, false)).toBeNull();
  });

  it("derives commission from base and rate (never stored)", () => {
    expect(computeHistoricalCommissionCents(100000, 50)).toBe(50000);
    expect(computeHistoricalCommissionCents(100000, 40)).toBe(40000);
    expect(computeHistoricalCommissionCents(null, 50)).toBeNull();
    expect(computeHistoricalCommissionCents(100000, null)).toBeNull();
  });
});

describe("historical domain - content hash and embedding text", () => {
  const baseItem = {
    type: QuoteItemType.LABOR,
    description: "Cambiar bujes",
    quantity: null,
    customerPriceCents: 120000,
    payrollBaseCents: 100000,
    ratePercent: 50,
    includeInPayroll: false,
    isKit: false,
  };

  it("is stable for identical content and changes with content", () => {
    const hashA = computeItemContentHash("libreta-2026-01", "E-01", baseItem);
    const hashB = computeItemContentHash("libreta-2026-01", "E-01", baseItem);
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);

    const changed = computeItemContentHash("libreta-2026-01", "E-01", {
      ...baseItem,
      description: "Cambiar bujes delanteros",
    });
    expect(changed).not.toBe(hashA);
  });

  it("includes the work identity so equal items in different works never collide", () => {
    const hashE01 = computeItemContentHash("libreta-2026-01", "E-01", baseItem);
    const hashE02 = computeItemContentHash("libreta-2026-01", "E-02", baseItem);
    expect(hashE01).not.toBe(hashE02);
  });

  it("builds embedding text with the work context", () => {
    const text = buildItemEmbeddingText(
      {
        workRef: "E-01",
        customerName: "Juan Pérez",
        plate: "ABC123",
        brand: "Nissan",
        model: "NP300",
        masterName: "Luis",
      },
      {
        type: QuoteItemType.LABOR,
        description: "Cambiar bujes",
        quantity: null,
        customerPriceCents: 120000,
        payrollBaseCents: 100000,
        ratePercent: 50,
        isKit: false,
      },
    );
    expect(text).toContain("E-01");
    expect(text).toContain("Juan Pérez");
    expect(text).toContain("Nissan");
    expect(text).toContain("NP300");
    expect(text).toContain("ABC123");
    expect(text).toContain("Luis");
    expect(text).toContain("Cambiar bujes");
    expect(text).toContain("50%");
  });
});

describe("historical domain - normalization", () => {
  it("normalizes a parts item into cents with derived unit and null payroll fields", () => {
    const item = normalizeHistoricalItem(
      {
        type: QuoteItemType.REFACCIONES,
        description: "4 tornillos",
        quantity: 4,
        customerPrice: 200,
      },
      0,
    );
    expect(item.customerPriceCents).toBe(20000);
    expect(item.quantity).toBe(4);
    expect(item.unitPriceCents).toBe(5000);
    expect(item.ratePercent).toBeNull();
    expect(item.payrollBaseCents).toBeNull();
    expect(item.includeInPayroll).toBe(false);
    expect(item.isKit).toBe(false);
  });

  it("detects a kit and derives rate for labor", () => {
    const item = normalizeHistoricalItem(
      {
        type: QuoteItemType.REFACCIONES,
        description: "Kit de pernos de dirección",
        quantity: 1,
        customerPrice: 850,
      },
      1,
    );
    expect(item.isKit).toBe(true);
    expect(item.unitPriceCents).toBe(85000);

    const labor = normalizeHistoricalItem(
      {
        type: QuoteItemType.LABOR,
        description: "Soldadura de percha",
        customerPrice: 900,
        payrollBase: 800,
      },
      2,
    );
    expect(labor.ratePercent).toBe(40);
    expect(labor.commissionCents).toBe(32000);
    expect(labor.quantity).toBeNull();
  });

  it("finalizes hash and embedding text with batch and work identity", () => {
    const item = normalizeHistoricalItem(
      { type: QuoteItemType.LABOR, description: "Cambiar bujes", customerPrice: 1200 },
      0,
    );
    const finalized = finalizeHistoricalItem(
      item,
      "libreta-2026-01",
      "E-01",
      { workRef: "E-01", customerName: "Juan", plate: null, brand: null, model: null, masterName: null },
    );
    expect(finalized.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(finalized.embeddingText).toContain("Cambiar bujes");
    expect(finalized.embeddingText).toContain("E-01");
  });
});