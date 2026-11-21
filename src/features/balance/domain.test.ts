import { describe, expect, it } from "vitest";
import {
  billedByCategory,
  buildBalancePeriods,
  buildPeriodBuckets,
  fullSettlementDate,
  INCOME_CATEGORY_BY_ITEM_TYPE,
  type BalanceNote,
} from "./domain";

const day = (value: string) => new Date(`${value}T18:00:00Z`);
const october = { label: "octubre", start: day("2026-10-01"), end: day("2026-11-01") };
const november = { label: "noviembre", start: day("2026-11-01"), end: day("2026-12-01") };

describe("income category mapping", () => {
  it("maps materials and refacciones together and keeps OTHER apart", () => {
    expect(INCOME_CATEGORY_BY_ITEM_TYPE).toEqual({
      LABOR: "labor",
      MATERIAL: "materials",
      REFACCIONES: "materials",
      OTHER: "other",
    });
  });
});

describe("billedByCategory", () => {
  it("sums line totals per category, derives a missing total from unit price, and skips unknown amounts", () => {
    expect(
      billedByCategory([
        { id: "1", type: "LABOR", quantity: 1, unitPriceCents: null, totalCents: 100000 },
        { id: "2", type: "MATERIAL", quantity: 2, unitPriceCents: 15000, totalCents: null },
        { id: "3", type: "REFACCIONES", quantity: 1, unitPriceCents: null, totalCents: 20000 },
        { id: "4", type: "OTHER", quantity: 1, unitPriceCents: null, totalCents: 5000 },
        { id: "5", type: "LABOR", quantity: 1, unitPriceCents: null, totalCents: null },
        { id: "1", type: "LABOR", quantity: 1, unitPriceCents: null, totalCents: 100000 },
      ]),
    ).toEqual({ labor: 100000, materials: 50000, other: 5000 });
  });
});

describe("fullSettlementDate", () => {
  it("returns the date of the payment that completed the note, in date order", () => {
    expect(
      fullSettlementDate(10000, [
        { amountCents: 6000, createdAt: day("2026-11-03") },
        { amountCents: 4000, createdAt: day("2026-10-20") },
      ]),
    ).toEqual(day("2026-11-03"));
  });

  it("returns null for open, partially paid or zero-total notes", () => {
    expect(fullSettlementDate(10000, [])).toBeNull();
    expect(fullSettlementDate(10000, [{ amountCents: 9999, createdAt: day("2026-11-03") }])).toBeNull();
    expect(fullSettlementDate(0, [{ amountCents: 1, createdAt: day("2026-11-03") }])).toBeNull();
  });
});

describe("buildBalancePeriods", () => {
  const settledAcrossPeriods: BalanceNote = {
    completedAt: day("2026-10-05"),
    totalCents: 10000,
    billed: { labor: 7000, materials: 2000, other: 1000 },
    applications: [
      { amountCents: 4000, createdAt: day("2026-10-20") },
      { amountCents: 6000, createdAt: day("2026-11-03") },
    ],
  };
  const partiallyPaid: BalanceNote = {
    completedAt: day("2026-11-10"),
    totalCents: 5000,
    billed: { labor: 5000, materials: 0, other: 0 },
    applications: [{ amountCents: 1000, createdAt: day("2026-11-12") }],
  };

  it("puts the whole billed amount in the period the settlement completed, without prorating earlier payments", () => {
    const [oct, nov] = buildBalancePeriods([settledAcrossPeriods, partiallyPaid], [october, november]);

    expect(oct.settledBilled).toEqual({ labor: 0, materials: 0, other: 0 });
    expect(nov.settledBilled).toEqual({ labor: 7000, materials: 2000, other: 1000 });
  });

  it("keeps open and partially paid notes only in the receivable at each period close", () => {
    const [oct, nov] = buildBalancePeriods([settledAcrossPeriods, partiallyPaid], [october, november]);

    // October closes owing 6,000 of the first note; the second was not completed yet.
    expect(oct.receivableAtCloseCents).toBe(6000);
    // November: the first note is settled; the second still owes 4,000.
    expect(nov.receivableAtCloseCents).toBe(4000);
  });
});

describe("buildPeriodBuckets", () => {
  it("lists the anchor month and the five before it, oldest first, at Mexico City midnight", () => {
    const buckets = buildPeriodBuckets("month", "2026-11-21");

    expect(buckets.map((bucket) => bucket.label)).toEqual([
      "junio de 2026",
      "julio de 2026",
      "agosto de 2026",
      "septiembre de 2026",
      "octubre de 2026",
      "noviembre de 2026",
    ]);
    expect(buckets[5].start).toEqual(new Date("2026-11-01T06:00:00Z"));
    expect(buckets[5].end).toEqual(new Date("2026-12-01T06:00:00Z"));
  });

  it("uses Monday-to-Sunday weeks and compares years for the whole history", () => {
    const weeks = buildPeriodBuckets("week", "2026-11-21", 2);
    expect(weeks[1].start).toEqual(new Date("2026-11-16T06:00:00Z"));
    expect(weeks[1].end).toEqual(new Date("2026-11-23T06:00:00Z"));

    expect(buildPeriodBuckets("all", "2026-11-21", 2).map((bucket) => bucket.label)).toEqual(["Año 2025", "Año 2026"]);
  });
});
