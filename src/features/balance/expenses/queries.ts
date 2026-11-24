import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
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
  await requireAdmin();
  const period = parseMonthPeriod(month, now);
  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null, spentAt: { gte: period.dateStart, lt: period.dateEnd } },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, spentAt: true, amountCents: true, category: true, invoiceStatus: true, partsSharePercent: true, supplier: true, paymentMethod: true, notes: true },
  });
  return { period, expenses };
}
