import { describe, expect, it } from "vitest";
import { buildProfitSummary, recognizeExpenses, jobMargins, noteIncomeByAccount, noteSettlement, splitExpense, type SettlableNote } from "./profit";

function note(overrides: Partial<SettlableNote["quote"]> = {}, applications: Array<[number, string]> = []): SettlableNote {
  return {
    quote: {
      subtotalCents: 100_000, discountCents: 0, taxCents: 16_000, totalCents: 116_000, taxEnabled: true,
      items: [
        { type: "LABOR", quantity: 1, unitPriceCents: 30_000, totalCents: 30_000, sectionId: null },
        { type: "REFACCIONES", quantity: 1, unitPriceCents: 50_000, totalCents: 50_000, sectionId: null },
        { type: "MATERIAL", quantity: 1, unitPriceCents: 10_000, totalCents: 10_000, sectionId: null },
        { type: "OTHER", quantity: 1, unitPriceCents: 10_000, totalCents: 10_000, sectionId: null },
      ],
      sections: [],
      settlementAgreement: null,
      ...overrides,
    },
    paymentApplications: applications.map(([amountCents, date]) => ({ amountCents, createdAt: new Date(date) })),
  };
}

describe("splitExpense", () => {
  it("always adds up to the amount, whatever the rounding", () => {
    for (const [amount, percent] of [[10_001, 50], [333, 33], [1, 50], [99_999, 100], [500, 0]]) {
      const { partsCents, laborCents } = splitExpense(amount, percent);
      expect(partsCents + laborCents).toBe(amount);
    }
    expect(splitExpense(10_000, 50)).toEqual({ partsCents: 5_000, laborCents: 5_000 });
    expect(splitExpense(10_000, 0)).toEqual({ partsCents: 0, laborCents: 10_000 });
  });
});

describe("noteSettlement", () => {
  it("settles on the application that covers the full effective total, ignoring earlier partial payments", () => {
    const settled = noteSettlement(note({}, [[50_000, "2026-09-10T18:00:00Z"], [66_000, "2026-11-05T18:00:00Z"]]));
    expect(settled.totals.totalCents).toBe(116_000);
    expect(settled.settledAt).toEqual(new Date("2026-11-05T18:00:00Z"));
  });

  it("stays open while the applications do not cover the total", () => {
    expect(noteSettlement(note({}, [[115_999, "2026-11-05T18:00:00Z"]])).settledAt).toBeNull();
    expect(noteSettlement(note({}, [])).settledAt).toBeNull();
  });

  it("uses the active settlement agreement total", () => {
    const agreement = { id: "a", status: "ACTIVE", settlementBaseCents: 80_000, settlementTaxCents: 12_800, settlementTotalCents: 92_800 } as never;
    const settled = noteSettlement(note({ settlementAgreement: agreement }, [[92_800, "2026-11-05T18:00:00Z"]]));
    expect(settled.totals.totalCents).toBe(92_800);
    expect(settled.settledAt).toEqual(new Date("2026-11-05T18:00:00Z"));
  });
});

describe("noteIncomeByAccount", () => {
  it("maps LABOR to labor, MATERIAL and REFACCIONES to parts, OTHER to other, without tax", () => {
    expect(noteIncomeByAccount(note())).toEqual({ laborCents: 30_000, partsCents: 60_000, otherCents: 10_000 });
  });

  it("spreads a discount or agreement across the categories and still adds up to the base", () => {
    const agreement = { id: "a", status: "ACTIVE", settlementBaseCents: 50_001, settlementTaxCents: 0, settlementTotalCents: 50_001 } as never;
    const income = noteIncomeByAccount(note({ settlementAgreement: agreement }));
    expect(income.laborCents + income.partsCents + income.otherCents).toBe(50_001);
    expect(income.partsCents).toBeGreaterThan(income.laborCents);
  });

  it("ignores items of sections that were not authorized", () => {
    const withSection = note({
      items: [
        { type: "LABOR", quantity: 1, unitPriceCents: 40_000, totalCents: 40_000, sectionId: "s-ok" },
        { type: "REFACCIONES", quantity: 1, unitPriceCents: 60_000, totalCents: 60_000, sectionId: "s-no" },
      ],
      sections: [{ id: "s-ok" }],
      subtotalCents: 40_000, taxCents: 6_400, totalCents: 46_400,
    });
    expect(noteIncomeByAccount(withSection)).toEqual({ laborCents: 40_000, partsCents: 0, otherCents: 0 });
  });

  it("puts a note with no priced items entirely in other so nothing is lost", () => {
    expect(noteIncomeByAccount(note({ items: [], subtotalCents: 7_000, taxCents: 0, totalCents: 7_000 }))).toEqual({ laborCents: 0, partsCents: 0, otherCents: 7_000 });
  });
});

describe("buildProfitSummary", () => {
  const input = {
    income: { laborCents: 100_000, partsCents: 60_000, otherCents: 5_000 },
    cashCollectedCents: 150_000,
    payrollCents: 40_000,
    expenses: [
      { amountCents: 20_000, invoiceStatus: "NOT_INVOICED" as const, partsSharePercent: 0 }, // renta
      { amountCents: 3_000, invoiceStatus: "INVOICED" as const, partsSharePercent: 0 }, // luz
      { amountCents: 10_000, invoiceStatus: "INVOICED" as const, partsSharePercent: 50 }, // gasolina
      { amountCents: 30_000, invoiceStatus: "NOT_INVOICED" as const, partsSharePercent: 100 }, // refacciones
    ],
  };

  it("builds the labor account with its coverage", () => {
    const { labor } = buildProfitSummary(input);
    expect(labor.incomeCents).toBe(100_000);
    expect(labor.payrollCents).toBe(40_000);
    expect(labor.expensesCents).toBe(28_000); // 20,000 + 3,000 + half of 10,000
    expect(labor.remainingCents).toBe(100_000 - 40_000 - 28_000);
    expect(labor.coveragePercent).toBe(Math.round((100_000 / 68_000) * 100));
  });

  it("builds the parts account as free profit after its own purchases and its share of shared expenses", () => {
    const { parts } = buildProfitSummary(input);
    expect(parts.expensesCents).toBe(35_000); // half of the fuel + the parts purchase
    expect(parts.remainingCents).toBe(60_000 - 35_000);
  });

  it("makes the three views reconcile exactly", () => {
    const summary = buildProfitSummary(input);
    expect(summary.general.incomeCents).toBe(165_000);
    expect(summary.general.spentCents).toBe(40_000 + 63_000);
    expect(summary.general.remainingCents).toBe(summary.labor.remainingCents + summary.parts.remainingCents + summary.income.otherCents);
    expect(summary.general.expensesCents).toBe(summary.labor.expensesCents + summary.parts.expensesCents);
  });

  it("splits every account's expenses into with and without invoice, adding up to the total", () => {
    const { general, labor, parts } = buildProfitSummary(input);
    expect(general.expensesByInvoice).toEqual({ invoicedCents: 13_000, notInvoicedCents: 50_000, totalCents: 63_000 });
    for (const account of [labor, parts]) {
      expect(account.expensesByInvoice.invoicedCents + account.expensesByInvoice.notInvoicedCents).toBe(account.expensesCents);
    }
  });

  it("keeps cash collected as a reference apart from income and the result", () => {
    const summary = buildProfitSummary(input);
    expect(summary.cashCollectedCents).toBe(150_000);
    expect(summary.general.remainingCents).not.toBe(150_000 - summary.general.spentCents);
  });

  it("handles an empty month without errors or a coverage figure", () => {
    const summary = buildProfitSummary({ income: { laborCents: 0, partsCents: 0, otherCents: 0 }, cashCollectedCents: 0, payrollCents: 0, expenses: [] });
    expect(summary.labor.coveragePercent).toBeNull();
    expect(summary.general).toMatchObject({ incomeCents: 0, spentCents: 0, remainingCents: 0 });
  });

  it("shows a negative remaining when labor does not cover its costs", () => {
    const { labor } = buildProfitSummary({ ...input, income: { laborCents: 10_000, partsCents: 0, otherCents: 0 } });
    expect(labor.remainingCents).toBeLessThan(0);
    expect(labor.coveragePercent).toBeLessThan(100);
  });
});

describe("recognizeExpenses", () => {
  const inMonth = (date: Date) => date.getUTCMonth() === 10;
  const base = { invoiceStatus: "INVOICED" as const, partsSharePercent: 100 };

  it("counts an uncharged purchase on its payment date, and only there", () => {
    const expense = { ...base, spentAt: new Date("2026-11-05T00:00:00Z"), amountCents: 10_000, allocations: [] };
    expect(recognizeExpenses([expense], new Set(), inMonth)).toEqual([{ ...base, amountCents: 10_000 }]);
    expect(recognizeExpenses([{ ...expense, spentAt: new Date("2026-10-30T00:00:00Z") }], new Set(), inMonth)).toEqual([]);
  });

  it("moves the charged piece to the month its note settles and leaves the rest on the payment date", () => {
    const expense = {
      ...base,
      spentAt: new Date("2026-10-30T00:00:00Z"),
      amountCents: 10_000,
      allocations: [{ payableNoteId: "n1", amountCents: 6_000 }],
    };
    // November: n1 settles here, so only the charged 6,000 counts (the payment was in October).
    expect(recognizeExpenses([expense], new Set(["n1"]), inMonth)).toEqual([{ ...base, amountCents: 6_000 }]);
    // October: the 4,000 not charged counts; the charged piece waits for its note.
    expect(recognizeExpenses([expense], new Set(), (d) => d.getUTCMonth() === 9)).toEqual([{ ...base, amountCents: 4_000 }]);
  });

  it("never counts the same cents twice across months", () => {
    const expense = { ...base, spentAt: new Date("2026-10-30T00:00:00Z"), amountCents: 10_000, allocations: [{ payableNoteId: "n1", amountCents: 10_000 }] };
    const october = recognizeExpenses([expense], new Set(), (d) => d.getUTCMonth() === 9);
    const november = recognizeExpenses([expense], new Set(["n1"]), inMonth);
    expect(october).toEqual([]);
    expect(november.reduce((sum, piece) => sum + piece.amountCents, 0)).toBe(10_000);
  });
});

describe("jobMargins", () => {
  const expense = (amountCents: number, partsSharePercent: number, allocations: Array<[string, number]>) => ({
    amountCents, partsSharePercent, invoiceStatus: "INVOICED" as const, spentAt: new Date("2026-10-30T00:00:00Z"),
    allocations: allocations.map(([payableNoteId, cents]) => ({ payableNoteId, amountCents: cents })),
  });

  it("subtracts the parts cost charged to each note from what it sold in parts, worst margin first", () => {
    const jobs = jobMargins(
      [{ id: "a", partsIncomeCents: 100_000 }, { id: "b", partsIncomeCents: 50_000 }],
      [expense(80_000, 100, [["a", 60_000], ["b", 20_000]]), expense(10_000, 50, [["b", 10_000]])],
    );
    expect(jobs.map((job) => job.noteId)).toEqual(["b", "a"]);
    expect(jobs[0]).toMatchObject({ partsCostCents: 25_000, marginCents: 25_000, marginPercent: 50 });
    expect(jobs[1]).toMatchObject({ partsCostCents: 60_000, marginCents: 40_000, marginPercent: 40 });
  });

  it("flags a loss and gives no percentage to a note that sold no parts", () => {
    const [worst, loss] = jobMargins([{ id: "a", partsIncomeCents: 10_000 }, { id: "b", partsIncomeCents: 0 }], [expense(30_000, 100, [["a", 30_000], ["b", 5_000]])]);
    expect(worst).toMatchObject({ noteId: "a", marginCents: -20_000, marginPercent: -200 });
    expect(loss).toMatchObject({ noteId: "b", marginCents: -5_000, marginPercent: null });
  });

  it("leaves out notes with neither parts income nor cost", () => {
    expect(jobMargins([{ id: "a", partsIncomeCents: 0 }], [])).toEqual([]);
  });
});
