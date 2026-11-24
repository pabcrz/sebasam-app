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
  /** Items typed OTHER: shown only in the general view, outside both accounts. */
  otherCents: number;
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
 * LABOR -> labor, MATERIAL and REFACCIONES -> parts, OTHER -> other. The three parts add up to the base.
 */
export function noteIncomeByAccount(note: SettlableNote): IncomeByAccount {
  const { totals } = noteSettlement(note);
  const authorized = new Set(note.quote.sections.map((section) => section.id));
  const items = note.quote.items.filter((item) => !item.sectionId || authorized.has(item.sectionId));

  let labor = 0;
  let parts = 0;
  let other = 0;
  for (const item of items) {
    const amount = itemAmountCents(item);
    if (item.type === QuoteItemType.LABOR) labor += amount;
    else if (item.type === QuoteItemType.MATERIAL || item.type === QuoteItemType.REFACCIONES) parts += amount;
    else other += amount;
  }

  const sum = labor + parts + other;
  const base = totals.subtotalCents;
  if (sum <= 0) return { laborCents: 0, partsCents: 0, otherCents: base };

  const laborCents = Math.round((base * labor) / sum);
  const partsCents = Math.round((base * parts) / sum);
  return { laborCents, partsCents, otherCents: base - laborCents - partsCents };
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
    /** = labor.remaining + parts.remaining + other income. */
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
  const totalIncome = input.income.laborCents + input.income.partsCents + input.income.otherCents;
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
