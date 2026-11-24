import { PaymentStatus, PayableNoteStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { sumCollectedPayments } from "@/features/dashboard/queries";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams, type ParsedPayrollParams } from "@/features/payroll/period";
import { buildProfitSummary, noteIncomeByAccount, noteSettlement, type IncomeByAccount, type ProfitSummary } from "./profit";

export interface MonthPeriod {
  /** "YYYY-MM" of the month shown. */
  month: string;
  label: string;
  prevMonth: string;
  nextMonth: string;
  isCurrent: boolean;
  /** Local midnights as instants: for timestamps (payments, settlements). */
  start: Date;
  end: Date;
  /** Calendar days at UTC midnight: for DATE columns such as an expense's `spentAt`. */
  dateStart: Date;
  dateEnd: Date;
}

/** `month` is "YYYY-MM"; anything else means the current month (Mexico City time). */
export function parseMonthPeriod(month: string | undefined, now = new Date()): MonthPeriod {
  const valid = typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const period: ParsedPayrollParams = parsePayrollParams({ mode: "monthly", anchor: valid ? `${month}-01` : undefined }, now);
  const [year, monthNumber] = period.anchor.slice(0, 7).split("-").map(Number);
  return {
    month: period.anchor.slice(0, 7),
    label: period.rangeLabel,
    prevMonth: period.prevAnchor.slice(0, 7),
    nextMonth: period.nextAnchor.slice(0, 7),
    isCurrent: period.isCurrentPeriod,
    start: period.start,
    end: period.end,
    dateStart: new Date(Date.UTC(year, monthNumber - 1, 1)),
    dateEnd: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

const ACTIVE_APPLICATION = { reversedAt: null, payment: { status: PaymentStatus.PAID, reversedAt: null } } as const;

/** Income of the month: every issued note that became fully settled in it, split by item category. */
async function getSettledIncome(period: MonthPeriod): Promise<IncomeByAccount> {
  const notes = await prisma.payableNote.findMany({
    where: {
      status: PayableNoteStatus.ISSUED,
      quoteId: { not: null },
      // The settling application is the last one, so it falls on or after the month's start.
      paymentApplications: { some: { ...ACTIVE_APPLICATION, createdAt: { gte: period.start } } },
    },
    select: {
      quote: {
        select: {
          subtotalCents: true,
          discountCents: true,
          taxCents: true,
          totalCents: true,
          taxEnabled: true,
          items: { select: { type: true, quantity: true, unitPriceCents: true, totalCents: true, sectionId: true } },
          sections: { where: { isAuthorized: true }, select: { id: true } },
          settlementAgreement: true,
        },
      },
      paymentApplications: { where: ACTIVE_APPLICATION, select: { amountCents: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const income: IncomeByAccount = { laborCents: 0, partsCents: 0, otherCents: 0 };
  for (const note of notes) {
    if (!note.quote) continue;
    const settlable = { quote: note.quote, paymentApplications: note.paymentApplications } as Parameters<typeof noteSettlement>[0];
    const { settledAt } = noteSettlement(settlable);
    if (!settledAt || settledAt < period.start || settledAt >= period.end) continue;

    const byAccount = noteIncomeByAccount(settlable);
    income.laborCents += byAccount.laborCents;
    income.partsCents += byAccount.partsCents;
    income.otherCents += byAccount.otherCents;
  }
  return income;
}

export interface ProfitSnapshot {
  period: MonthPeriod;
  summary: ProfitSummary;
}

export async function getProfitSnapshot(month: string | undefined, now = new Date()): Promise<ProfitSnapshot> {
  await requireAdmin();
  const period = parseMonthPeriod(month, now);

  const [income, collected, payroll, expenses] = await Promise.all([
    getSettledIncome(period),
    sumCollectedPayments({ startDate: period.start, endDate: period.end }),
    getWeeklyPayroll({ mode: "monthly", anchor: `${period.month}-01` }),
    prisma.expense.findMany({
      where: { deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } },
      select: { amountCents: true, invoiceStatus: true, partsSharePercent: true },
    }),
  ]);

  return {
    period,
    summary: buildProfitSummary({
      income,
      cashCollectedCents: collected._sum.amountCents ?? 0,
      payrollCents: payroll.totalPayableCents ?? payroll.totalCommissionCents,
      expenses,
    }),
  };
}
