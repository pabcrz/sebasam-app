import { QuoteItemType } from "@/generated/prisma/client";
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";

export interface ProfitExpense {
  amountCents: number;
  invoiceStatus: "INVOICED" | "NOT_INVOICED";
  partsSharePercent: number;
}

export interface IncomeByAccount {
  laborCents: number;
  partsCents: number;
}

/** Splits an expense between the two accounts; the two parts always add up to the amount. */
export function splitExpense(amountCents: number, partsSharePercent: number) {
  const partsCents = Math.round((amountCents * partsSharePercent) / 100);
  return { partsCents, laborCents: amountCents - partsCents };
}

type NoteItem = { type: QuoteItemType; quantity: unknown; unitPriceCents: number | null; totalCents: number | null; sectionId: string | null };

function itemAmountCents(item: NoteItem) {
  if (item.totalCents != null) return Number(item.totalCents);
  if (item.unitPriceCents != null) return Math.round(Number(item.unitPriceCents) * Number(item.quantity));
  return 0;
}

export type SettlableNote = {
  quote: {
    subtotalCents: number | null;
    discountCents: number;
    taxCents: number | null;
    totalCents: number | null;
    taxEnabled: boolean;
    items: NoteItem[];
    sections: Array<{ id: string }>;
    settlementAgreement: Parameters<typeof getEffectiveSettlementTotals>[1];
  };
  /** Active applications of PAID payments, oldest first. */
  paymentApplications: Array<{ amountCents: number; createdAt: Date }>;
};

/** The note's effective total (with tax) and the date its last application covered it, or null while it is still open. */
export function noteSettlement(note: SettlableNote) {
  // Stored totals, like the receivables on the dashboard: they already reflect the authorized sections.
  const totals = getEffectiveSettlementTotals(
    { subtotalCents: note.quote.subtotalCents, taxCents: note.quote.taxCents, totalCents: note.quote.totalCents },
    note.quote.settlementAgreement,
  );
  if (totals.totalCents <= 0) return { totals, settledAt: null as Date | null };

  let applied = 0;
  for (const application of note.paymentApplications) {
    applied += application.amountCents;
    if (applied >= totals.totalCents) return { totals, settledAt: application.createdAt };
  }
  return { totals, settledAt: null as Date | null };
}

/**
 * The note's base (without tax, after discounts or agreements) split by item category.
 * LABOR and OTHER -> labor (OTHER always goes to the payroll side; paying a mechanic from it is a manual decision),
 * MATERIAL and REFACCIONES -> parts. The two parts add up to the base.
 */
export function noteIncomeByAccount(note: SettlableNote): IncomeByAccount {
  const { totals } = noteSettlement(note);
  const authorized = new Set(note.quote.sections.map((section) => section.id));
  const items = note.quote.items.filter((item) => !item.sectionId || authorized.has(item.sectionId));

  let labor = 0;
  let parts = 0;
  for (const item of items) {
    const amount = itemAmountCents(item);
    if (item.type === QuoteItemType.LABOR) labor += amount;
    else if (item.type === QuoteItemType.MATERIAL || item.type === QuoteItemType.REFACCIONES) parts += amount;
    else labor += amount; // LABOR and OTHER
  }

  const sum = labor + parts;
  const base = totals.subtotalCents;
  if (sum <= 0) return { laborCents: base, partsCents: 0 };

  const laborCents = Math.round((base * labor) / sum);
  return { laborCents, partsCents: base - laborCents };
}

export interface RecognizableExpense extends ProfitExpense {
  spentAt: Date;
  /** Pieces charged to a note: [noteId, cents]. */
  allocations: Array<{ payableNoteId: string; amountCents: number }>;
}

/**
 * Pieces of expense that count in a month. A piece charged to a note counts when that note settles
 * (same month as its income); whatever is not charged counts on the day it was paid.
 * `settledNoteIds` are the notes settled in the month; `spentInMonth` tells if the payment date falls in it.
 */
export function recognizeExpenses(
  expenses: RecognizableExpense[],
  settledNoteIds: Set<string>,
  spentInMonth: (spentAt: Date) => boolean,
): ProfitExpense[] {
  const pieces: ProfitExpense[] = [];
  for (const expense of expenses) {
    const charged = expense.allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0);
    const base = { invoiceStatus: expense.invoiceStatus, partsSharePercent: expense.partsSharePercent };
    const uncharged = expense.amountCents - charged;
    if (uncharged > 0 && spentInMonth(expense.spentAt)) pieces.push({ ...base, amountCents: uncharged });
    for (const allocation of expense.allocations) {
      if (settledNoteIds.has(allocation.payableNoteId)) pieces.push({ ...base, amountCents: allocation.amountCents });
    }
  }
  return pieces;
}

export interface JobMargin {
  noteId: string;
  partsIncomeCents: number;
  /** Refacciones y materiales cost charged to the note (the parts share of each purchase piece). */
  partsCostCents: number;
  marginCents: number;
  /** margin ÷ parts income; null when the note sold no parts. */
  marginPercent: number | null;
}

/** Parts income against the parts cost charged to each settled note, worst margin first. */
export function jobMargins(
  notes: Array<{ id: string; partsIncomeCents: number }>,
  expenses: RecognizableExpense[],
): JobMargin[] {
  const cost = new Map<string, number>();
  for (const expense of expenses) {
    for (const allocation of expense.allocations) {
      const parts = splitExpense(allocation.amountCents, expense.partsSharePercent).partsCents;
      cost.set(allocation.payableNoteId, (cost.get(allocation.payableNoteId) ?? 0) + parts);
    }
  }
  return notes
    .map((note) => {
      const partsCostCents = cost.get(note.id) ?? 0;
      const marginCents = note.partsIncomeCents - partsCostCents;
      return {
        noteId: note.id,
        partsIncomeCents: note.partsIncomeCents,
        partsCostCents,
        marginCents,
        marginPercent: note.partsIncomeCents > 0 ? Math.round((marginCents / note.partsIncomeCents) * 100) : null,
      };
    })
    .filter((job) => job.partsIncomeCents > 0 || job.partsCostCents > 0)
    .sort((a, b) => a.marginCents - b.marginCents);
}

export interface InvoiceSplit {
  invoicedCents: number;
  notInvoicedCents: number;
  totalCents: number;
}

export interface AccountSummary {
  incomeCents: number;
  /** Calculated payroll; only the labor account carries it. */
  payrollCents: number;
  expensesCents: number;
  expensesByInvoice: InvoiceSplit;
  remainingCents: number;
}

export interface ProfitSummary {
  income: IncomeByAccount & { totalCents: number };
  /** Cash received in the month. Reference only: it can differ from income (partial payments, other months). */
  cashCollectedCents: number;
  labor: AccountSummary & {
    /** income ÷ (payroll + expenses); null when there is nothing to cover. */
    coveragePercent: number | null;
  };
  parts: AccountSummary;
  general: {
    incomeCents: number;
    payrollCents: number;
    expensesCents: number;
    expensesByInvoice: InvoiceSplit;
    spentCents: number;
    /** = labor.remaining + parts.remaining . */
    remainingCents: number;
  };
}

function emptySplit(): InvoiceSplit {
  return { invoicedCents: 0, notInvoicedCents: 0, totalCents: 0 };
}

function addToSplit(split: InvoiceSplit, invoiceStatus: ProfitExpense["invoiceStatus"], cents: number) {
  if (invoiceStatus === "INVOICED") split.invoicedCents += cents;
  else split.notInvoicedCents += cents;
  split.totalCents += cents;
}

export function buildProfitSummary(input: {
  income: IncomeByAccount;
  cashCollectedCents: number;
  payrollCents: number;
  expenses: ProfitExpense[];
}): ProfitSummary {
  const laborSplit = emptySplit();
  const partsSplit = emptySplit();
  const generalSplit = emptySplit();

  for (const expense of input.expenses) {
    const { partsCents, laborCents } = splitExpense(expense.amountCents, expense.partsSharePercent);
    addToSplit(laborSplit, expense.invoiceStatus, laborCents);
    addToSplit(partsSplit, expense.invoiceStatus, partsCents);
    addToSplit(generalSplit, expense.invoiceStatus, expense.amountCents);
  }

  const laborRemaining = input.income.laborCents - input.payrollCents - laborSplit.totalCents;
  const partsRemaining = input.income.partsCents - partsSplit.totalCents;
  const totalIncome = input.income.laborCents + input.income.partsCents;
  const laborCost = input.payrollCents + laborSplit.totalCents;

  return {
    income: { ...input.income, totalCents: totalIncome },
    cashCollectedCents: input.cashCollectedCents,
    labor: {
      incomeCents: input.income.laborCents,
      payrollCents: input.payrollCents,
      expensesCents: laborSplit.totalCents,
      expensesByInvoice: laborSplit,
      remainingCents: laborRemaining,
      coveragePercent: laborCost > 0 ? Math.round((input.income.laborCents / laborCost) * 100) : null,
    },
    parts: {
      incomeCents: input.income.partsCents,
      payrollCents: 0,
      expensesCents: partsSplit.totalCents,
      expensesByInvoice: partsSplit,
      remainingCents: partsRemaining,
    },
    general: {
      incomeCents: totalIncome,
      payrollCents: input.payrollCents,
      expensesCents: generalSplit.totalCents,
      expensesByInvoice: generalSplit,
      spentCents: input.payrollCents + generalSplit.totalCents,
      remainingCents: totalIncome - input.payrollCents - generalSplit.totalCents,
    },
  };
}

export type ComparisonSeries = "todas" | "mano-de-obra" | "refacciones";
export type ComparisonLevel = "fuerte" | "debil" | "tipico";

export interface MonthFigures {
  month: string;
  label: string;
  income: IncomeByAccount;
  /** Expenses recognized in the month (before payroll). */
  expensesCents: number;
}

export interface ComparedMonth extends MonthFigures {
  /** The income of the chosen series: all, labor or parts. */
  valueCents: number;
  /** Against the median of the months that had income; null when the month had none or there is too little history. */
  level: ComparisonLevel | null;
  /** Labor ÷ (labor + parts); null when both are zero. */
  laborSharePercent: number | null;
}

/** A month is "fuerte" above the median by this much and "débil" below it by the same; in between it is "típico". */
export const COMPARISON_BAND = 0.15;
const MIN_MONTHS_WITH_INCOME = 3;

function seriesValue(income: IncomeByAccount, series: ComparisonSeries) {
  if (series === "mano-de-obra") return income.laborCents;
  if (series === "refacciones") return income.partsCents;
  return income.laborCents + income.partsCents;
}

/** Describes each month against the others. A plain description of the past: no score, no forecast. */
export function compareMonths(months: MonthFigures[], series: ComparisonSeries): { months: ComparedMonth[]; medianCents: number | null } {
  const values = months.map((month) => seriesValue(month.income, series));
  const withIncome = values.filter((value) => value > 0).sort((a, b) => a - b);
  const enough = withIncome.length >= MIN_MONTHS_WITH_INCOME;
  const middle = Math.floor(withIncome.length / 2);
  const medianCents = !enough ? null : withIncome.length % 2 === 1 ? withIncome[middle] : Math.round((withIncome[middle - 1] + withIncome[middle]) / 2);

  return {
    medianCents,
    months: months.map((month, index) => {
      const valueCents = values[index];
      const level: ComparisonLevel | null =
        medianCents === null || valueCents <= 0 ? null : valueCents > medianCents * (1 + COMPARISON_BAND) ? "fuerte" : valueCents < medianCents * (1 - COMPARISON_BAND) ? "debil" : "tipico";
      const labourAndParts = month.income.laborCents + month.income.partsCents;
      return { ...month, valueCents, level, laborSharePercent: labourAndParts > 0 ? Math.round((month.income.laborCents / labourAndParts) * 100) : null };
    }),
  };
}
