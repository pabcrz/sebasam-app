import { prisma } from "@/lib/prisma";
import { requireExpenseRole, requireSuperAdmin } from "@/lib/auth/session";
import { parseMonthPeriod, type MonthPeriod } from "../profit-queries";

export interface ExpenseRow {
  id: string;
  spentAt: Date;
  amountCents: number;
  category: string;
  invoiceStatus: "INVOICED" | "NOT_INVOICED";
  partsSharePercent: number;
  supplier: string | null;
  paymentMethod: string | null;
  notes: string | null;
  /** True when a receipt photo or PDF is attached. */
  hasReceipt?: boolean;
}

export async function listExpensesForMonth(month: string | undefined, now = new Date()): Promise<{ period: MonthPeriod; expenses: ExpenseRow[] }> {
  await requireExpenseRole();
  const period = parseMonthPeriod(month, now);
  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, spentAt: true, amountCents: true, category: true, invoiceStatus: true, partsSharePercent: true, supplier: true, paymentMethod: true, notes: true, receiptPath: true },
  });
  return { period, expenses: expenses.map(({ receiptPath, ...expense }): ExpenseRow => ({ ...expense, hasReceipt: receiptPath !== null })) };
}

export interface SupplierOption {
  name: string;
  usuallyInvoiced: boolean;
  category: string | null;
}

/** The supplier catalog, to autocomplete the form and propose its category and invoice status. */
export async function listSuppliers(): Promise<SupplierOption[]> {
  await requireExpenseRole();
  return prisma.expenseSupplier.findMany({ orderBy: { name: "asc" }, select: { name: true, usuallyInvoiced: true, category: true } });
}

export interface RecurringRow {
  id: string;
  category: string;
  amountCents: number;
  invoiceStatus: "INVOICED" | "NOT_INVOICED";
  supplier: string | null;
  dayOfMonth: number;
}

const mexicoMonth = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).format(date).slice(0, 7);

/** Active templates and, of those, the ones still waiting for a decision in the month shown. Nothing is proposed for a future month or from before the template existed. */
export async function listRecurringForMonth(period: MonthPeriod, now = new Date()): Promise<{ templates: RecurringRow[]; pending: RecurringRow[] }> {
  await requireExpenseRole();
  const select = { id: true, category: true, amountCents: true, invoiceStatus: true, supplier: true, dayOfMonth: true, createdAt: true, skips: { where: { month: period.month }, select: { month: true } }, expenses: { where: { deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } }, select: { id: true } } } as const;
  const rows = await prisma.recurringExpense.findMany({ where: { active: true }, orderBy: [{ dayOfMonth: "asc" }, { createdAt: "asc" }], select });
  const proposable = period.month <= mexicoMonth(now);
  const templates = rows.map(({ skips, expenses, createdAt, ...row }) => ({ row: row as RecurringRow, open: proposable && mexicoMonth(createdAt) <= period.month && skips.length === 0 && expenses.length === 0 }));
  return { templates: templates.map((template) => template.row), pending: templates.filter((template) => template.open).map((template) => template.row) };
}

export interface ExpenseLink {
  payableNoteId: string;
  referenceNumber: string;
  amountCents: number;
}

export interface LinkableNote {
  id: string;
  label: string;
}

/** Owner only: the month's expenses with the notes each one is charged to, and the notes a purchase can be charged to. */
export async function listExpensesForAssignment(month: string | undefined, now = new Date()) {
  await requireSuperAdmin();
  const period = parseMonthPeriod(month, now);
  const [expenses, notes] = await Promise.all([
    prisma.expense.findMany({
      where: { deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, spentAt: true, amountCents: true, category: true, invoiceStatus: true, partsSharePercent: true, supplier: true, paymentMethod: true, notes: true,
        allocations: { select: { payableNoteId: true, amountCents: true, payableNote: { select: { referenceNumber: true } } }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.payableNote.findMany({
      where: { status: "ISSUED", quoteId: { not: null } },
      orderBy: { issuedAt: "desc" },
      take: 80,
      select: { id: true, referenceNumber: true, title: true, customer: { select: { name: true } } },
    }),
  ]);
  return {
    period,
    expenses: expenses.map(({ allocations, ...expense }) => ({
      ...expense,
      links: allocations.map((link): ExpenseLink => ({ payableNoteId: link.payableNoteId, referenceNumber: link.payableNote.referenceNumber, amountCents: link.amountCents })),
    })),
    notes: notes.map((note): LinkableNote => ({ id: note.id, label: [note.referenceNumber, note.customer?.name, note.title].filter(Boolean).join(" · ") })),
  };
}
