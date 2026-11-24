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
}

export async function listExpensesForMonth(month: string | undefined, now = new Date()): Promise<{ period: MonthPeriod; expenses: ExpenseRow[] }> {
  await requireExpenseRole();
  const period = parseMonthPeriod(month, now);
  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, spentAt: true, amountCents: true, category: true, invoiceStatus: true, partsSharePercent: true, supplier: true, paymentMethod: true, notes: true },
  });
  return { period, expenses };
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
