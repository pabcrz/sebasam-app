import { PaymentStatus, PayableNoteStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { sumCollectedPayments } from "@/features/dashboard/queries";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams, type ParsedPayrollParams } from "@/features/payroll/period";
import { buildProfitSummary, jobMargins, noteIncomeByAccount, noteSettlement, recognizeExpenses, type IncomeByAccount, type JobMargin, type ProfitSummary } from "./profit";

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

export interface SettledNote {
  id: string;
  referenceNumber: string;
  title: string;
  income: IncomeByAccount;
}

/** Notes fully settled in the month, with their income split by item category. */
async function getSettledNotes(period: MonthPeriod): Promise<SettledNote[]> {
  const notes = await prisma.payableNote.findMany({
    where: {
      status: PayableNoteStatus.ISSUED,
      quoteId: { not: null },
      // The settling application is the last one, so it falls on or after the month's start.
      paymentApplications: { some: { ...ACTIVE_APPLICATION, createdAt: { gte: period.start } } },
    },
    select: {
      id: true,
      referenceNumber: true,
      title: true,
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

  const settled: SettledNote[] = [];
  for (const note of notes) {
    if (!note.quote) continue;
    const settlable = { quote: note.quote, paymentApplications: note.paymentApplications } as Parameters<typeof noteSettlement>[0];
    const { settledAt } = noteSettlement(settlable);
    if (!settledAt || settledAt < period.start || settledAt >= period.end) continue;

    settled.push({ id: note.id, referenceNumber: note.referenceNumber, title: note.title, income: noteIncomeByAccount(settlable) });
  }
  return settled;
}

function sumIncome(notes: SettledNote[]): IncomeByAccount {
  const income: IncomeByAccount = { laborCents: 0, partsCents: 0, otherCents: 0 };
  for (const { income: byAccount } of notes) {
    income.laborCents += byAccount.laborCents;
    income.partsCents += byAccount.partsCents;
    income.otherCents += byAccount.otherCents;
  }
  return income;
}

export interface JobProfit extends JobMargin {
  referenceNumber: string;
  title: string;
}

export interface ProfitSnapshot {
  period: MonthPeriod;
  summary: ProfitSummary;
  /** Notes settled in the month with their refacciones margin, worst first. */
  jobs: JobProfit[];
}

export async function getProfitSnapshot(month: string | undefined, now = new Date()): Promise<ProfitSnapshot> {
  // Profit and how expenses are split are the owner's numbers.
  await requireSuperAdmin();
  const period = parseMonthPeriod(month, now);

  const [settledNotes, collected, payroll] = await Promise.all([
    getSettledNotes(period),
    sumCollectedPayments({ startDate: period.start, endDate: period.end }),
    getWeeklyPayroll({ mode: "monthly", anchor: `${period.month}-01` }),
  ]);

  const settledNoteIds = new Set(settledNotes.map((note) => note.id));
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      OR: [
        { spentAt: { gte: period.dateStart, lt: period.dateEnd } },
        // A purchase from another month still counts here when it was charged to a note settled in this one.
        { allocations: { some: { payableNoteId: { in: [...settledNoteIds] } } } },
      ],
    },
    select: {
      spentAt: true,
      amountCents: true,
      invoiceStatus: true,
      partsSharePercent: true,
      allocations: { select: { payableNoteId: true, amountCents: true } },
    },
  });

  const labels = new Map(settledNotes.map((note) => [note.id, note]));
  const jobs = jobMargins(settledNotes.map((note) => ({ id: note.id, partsIncomeCents: note.income.partsCents })), expenses).map((job) => ({
    ...job,
    referenceNumber: labels.get(job.noteId)?.referenceNumber ?? "",
    title: labels.get(job.noteId)?.title ?? "",
  }));

  return {
    period,
    jobs,
    summary: buildProfitSummary({
      income: sumIncome(settledNotes),
      cashCollectedCents: collected._sum.amountCents ?? 0,
      payrollCents: payroll.totalPayableCents ?? payroll.totalCommissionCents,
      expenses: recognizeExpenses(expenses, settledNoteIds, (spentAt) => spentAt >= period.dateStart && spentAt < period.dateEnd),
    }),
  };
}
