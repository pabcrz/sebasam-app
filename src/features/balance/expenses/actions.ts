"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { expenseInputSchema, pesosTextToCents } from "./schemas";

const balancePath = "/admin/balance";

function expenseFormToInput(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : null;
  };
  return {
    spentAt: text("spentAt"),
    amountCents: pesosTextToCents(formData.get("amount")),
    category: text("category"),
    invoiceStatus: text("invoiceStatus"),
    partsSharePercent: Number(text("partsSharePercent")),
    supplier: text("supplier") ?? "",
    paymentMethod: text("paymentMethod") || null,
    notes: text("notes") ?? "",
  };
}

/** Back to the expenses tab of the month the user was looking at; never to an arbitrary address. */
function expensesHref(formData: FormData, flag: string) {
  const month = formData.get("month");
  const valid = typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  return `${balancePath}?tab=gastos${valid ? `&month=${month}` : ""}&${flag}`;
}

export async function createExpenseFromForm(formData: FormData) {
  const { profile } = await requireAdmin();

  const parsed = expenseInputSchema.safeParse(expenseFormToInput(formData));
  if (!parsed.success) redirect(expensesHref(formData, "error=invalid"));

  await prisma.expense.create({
    data: { ...parsed.data, spentAt: new Date(`${parsed.data.spentAt}T00:00:00.000Z`), createdById: profile.id },
  });

  revalidatePath(balancePath);
  redirect(expensesHref(formData, "created=1"));
}

export async function updateExpenseFromForm(expenseId: string, formData: FormData) {
  await requireAdmin();

  const parsed = expenseInputSchema.safeParse(expenseFormToInput(formData));
  if (!parsed.success) redirect(expensesHref(formData, "error=invalid"));

  const result = await prisma.expense.updateMany({
    where: { id: expenseId, deletedAt: null },
    data: { ...parsed.data, spentAt: new Date(`${parsed.data.spentAt}T00:00:00.000Z`) },
  });
  if (result.count === 0) redirect(expensesHref(formData, "error=notfound"));

  revalidatePath(balancePath);
  redirect(expensesHref(formData, "updated=1"));
}

/** Soft delete: the row stays for audit but no longer counts anywhere. */
export async function deleteExpenseFromForm(expenseId: string, formData: FormData) {
  await requireAdmin();

  await prisma.expense.updateMany({ where: { id: expenseId, deletedAt: null }, data: { deletedAt: new Date() } });

  revalidatePath(balancePath);
  redirect(expensesHref(formData, "deleted=1"));
}
