import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getWeeklyPayroll } from "@/features/payroll/queries";

vi.mock("@/lib/auth/session", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/features/payroll/queries", () => ({ getWeeklyPayroll: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { payableNote: { findMany: vi.fn() }, expense: { findMany: vi.fn() }, payment: { aggregate: vi.fn() } },
}));

import { getProfitSnapshot, parseMonthPeriod } from "./profit-queries";

const now = new Date("2026-11-23T18:00:00.000Z");

function note(items: Array<[string, number]>, base: number, applications: Array<[number, string]>) {
  return {
    quote: {
      subtotalCents: base, discountCents: 0, taxCents: Math.round(base * 0.16), totalCents: base + Math.round(base * 0.16), taxEnabled: true,
      items: items.map(([type, totalCents]) => ({ type, quantity: 1, unitPriceCents: totalCents, totalCents, sectionId: null })),
      sections: [], settlementAgreement: null,
    },
    paymentApplications: applications.map(([amountCents, date]) => ({ amountCents, createdAt: new Date(date) })),
  };
}

describe("parseMonthPeriod", () => {
  it("shows the requested month with its neighbours and Mexico City boundaries", () => {
    const period = parseMonthPeriod("2026-09", now);

    expect(period).toMatchObject({ month: "2026-09", prevMonth: "2026-08", nextMonth: "2026-10", isCurrent: false });
    expect(period.start).toEqual(new Date("2026-09-01T06:00:00.000Z"));
    expect(period.end).toEqual(new Date("2026-10-01T06:00:00.000Z"));
    expect(period.dateStart).toEqual(new Date("2026-09-01T00:00:00.000Z"));
    expect(period.dateEnd).toEqual(new Date("2026-10-01T00:00:00.000Z"));
  });

  it("wraps the year in both directions", () => {
    expect(parseMonthPeriod("2026-01", now)).toMatchObject({ prevMonth: "2025-12", nextMonth: "2026-02" });
    expect(parseMonthPeriod("2026-12", now)).toMatchObject({ prevMonth: "2026-11", nextMonth: "2027-01" });
  });

  it.each([undefined, "", "2026-13", "2026-00", "26-11", "noviembre", "2026-11-05"])("falls back to the current month for %s", (value) => {
    expect(parseMonthPeriod(value, now)).toMatchObject({ month: "2026-11", isCurrent: true });
  });
});

describe("getProfitSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWeeklyPayroll).mockResolvedValue({ totalPayableCents: 40_000, totalCommissionCents: 30_000 } as never);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 3 }, _sum: { amountCents: 250_000 } } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { amountCents: 20_000, invoiceStatus: "NOT_INVOICED", partsSharePercent: 0 },
      { amountCents: 10_000, invoiceStatus: "INVOICED", partsSharePercent: 50 },
    ] as never);
    vi.mocked(prisma.payableNote.findMany).mockResolvedValue([
      // Settled in November by the second payment, even though the first one came in September.
      note([["LABOR", 60_000], ["REFACCIONES", 40_000]], 100_000, [[50_000, "2026-09-10T18:00:00Z"], [66_000, "2026-11-05T18:00:00Z"]]),
      // Settled in October: not part of November.
      note([["LABOR", 100_000]], 100_000, [[116_000, "2026-10-15T18:00:00Z"]]),
      // Still open in November: only a partial payment.
      note([["REFACCIONES", 100_000]], 100_000, [[50_000, "2026-11-10T18:00:00Z"]]),
    ] as never);
  });

  it("recognizes a note only in the month it is fully settled, with its whole total by category", async () => {
    const { summary } = await getProfitSnapshot("2026-11", now);

    expect(summary.income).toMatchObject({ laborCents: 60_000, partsCents: 40_000, otherCents: 0, totalCents: 100_000 });
  });

  it("builds both accounts from the calculated payroll and the month's expenses, and the views reconcile", async () => {
    const { summary } = await getProfitSnapshot("2026-11", now);

    expect(summary.labor.payrollCents).toBe(40_000);
    expect(summary.labor.expensesCents).toBe(25_000);
    expect(summary.parts.expensesCents).toBe(5_000);
    expect(summary.labor.remainingCents).toBe(60_000 - 40_000 - 25_000);
    expect(summary.parts.remainingCents).toBe(40_000 - 5_000);
    expect(summary.general.remainingCents).toBe(summary.labor.remainingCents + summary.parts.remainingCents);
    expect(summary.cashCollectedCents).toBe(250_000);
  });

  it("asks only for the month's data and requires the owner", async () => {
    await getProfitSnapshot("2026-11", now);

    expect(requireSuperAdmin).toHaveBeenCalled();
    expect(getWeeklyPayroll).toHaveBeenCalledWith({ mode: "monthly", anchor: "2026-11-01" });
    expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { deletedAt: null, spentAt: { gte: new Date("2026-11-01T00:00:00.000Z"), lt: new Date("2026-12-01T00:00:00.000Z") } },
    }));
    expect(prisma.payment.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ createdAt: { gte: new Date("2026-11-01T06:00:00.000Z"), lt: new Date("2026-12-01T06:00:00.000Z") } }),
    }));
  });

  it("does not let a non-owner through, not even an ADMIN", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new Error("forbidden"));
    await expect(getProfitSnapshot("2026-11", now)).rejects.toThrow("forbidden");
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
  });

  it("falls back to the commissions when the payroll has no payable total", async () => {
    vi.mocked(getWeeklyPayroll).mockResolvedValue({ totalCommissionCents: 30_000 } as never);
    const { summary } = await getProfitSnapshot("2026-11", now);
    expect(summary.labor.payrollCents).toBe(30_000);
  });

  it("returns a clean empty month", async () => {
    vi.mocked(prisma.payableNote.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([] as never);
    vi.mocked(getWeeklyPayroll).mockResolvedValue({ totalPayableCents: 0, totalCommissionCents: 0 } as never);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);

    const { summary } = await getProfitSnapshot("2026-11", now);

    expect(summary.general).toMatchObject({ incomeCents: 0, spentCents: 0, remainingCents: 0 });
    expect(summary.labor.coveragePercent).toBeNull();
  });
});
