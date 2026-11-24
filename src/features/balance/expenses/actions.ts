"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ExpenseCategory, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireExpenseRole, requireSuperAdmin } from "@/lib/auth/session";
import { defaultPartsShareFor } from "./categories";
import { expenseInputSchema, partsShareSchema, pesosTextToCents } from "./schemas";

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
    supplier: text("supplier") ?? "",
    paymentMethod: text("paymentMethod") || null,
    notes: text("notes") ?? "",
    receiptPath: text("receiptPath") || null,
  };
}

/** The "YYYY-MM" the form was looking at, or null: never build a link or a date from anything else. */
function monthOf(formData: FormData) {
  const month = formData.get("month");
  return typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
}

/** Back to the expenses tab of the month the user was looking at; never to an arbitrary address. */
function expensesHref(formData: FormData, flag: string) {
  const month = monthOf(formData);
  return `${balancePath}?tab=gastos${month ? `&month=${month}` : ""}&${flag}`;
}

/** The catalog learns from each expense: the supplier remembers the invoice status and category last used with it. */
async function rememberSupplier(tx: Prisma.TransactionClient, name: string | null, invoiceStatus: "INVOICED" | "NOT_INVOICED", category: ExpenseCategory) {
  if (!name) return null;
  const data = { usuallyInvoiced: invoiceStatus === "INVOICED", category };
  const supplier = await tx.expenseSupplier.upsert({ where: { name }, create: { name, ...data }, update: data, select: { id: true } });
  return supplier.id;
}

/** Back to the owner's Asignar view of the month being looked at. */
function assignHref(formData: FormData, flag: string) {
  const month = formData.get("month");
  const valid = typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  return `${balancePath}?tab=utilidad&view=asignar${valid ? `&month=${month}` : ""}&${flag}`;
}

export async function createExpenseFromForm(formData: FormData) {
  const { profile } = await requireExpenseRole();

  const parsed = expenseInputSchema.safeParse(expenseFormToInput(formData));
  if (!parsed.success) redirect(expensesHref(formData, "error=invalid"));

  const repeat = formData.get("repeat") === "on";
  await prisma.$transaction(async (tx) => {
    const supplierId = await rememberSupplier(tx, parsed.data.supplier, parsed.data.invoiceStatus, parsed.data.category);
    // "Repetir cada mes" creates the template and ties this expense to it, so this month is not proposed again.
    const recurring = repeat
      ? await tx.recurringExpense.create({
          data: {
            category: parsed.data.category,
            amountCents: parsed.data.amountCents,
            invoiceStatus: parsed.data.invoiceStatus,
            supplier: parsed.data.supplier,
            paymentMethod: parsed.data.paymentMethod,
            dayOfMonth: Math.min(Number(parsed.data.spentAt.slice(8, 10)), 28),
          },
          select: { id: true },
        })
      : null;
    // Whoever registers does not choose how the expense is split: the category proposes it and the owner assigns it later.
    await tx.expense.create({
      data: {
        ...parsed.data,
        partsSharePercent: defaultPartsShareFor(parsed.data.category),
        spentAt: new Date(`${parsed.data.spentAt}T00:00:00.000Z`),
        createdById: profile.id,
        supplierId,
        recurringExpenseId: recurring?.id ?? null,
      },
    });
  });

  revalidatePath(balancePath);
  redirect(expensesHref(formData, "created=1"));
}

export async function updateExpenseFromForm(expenseId: string, formData: FormData) {
  await requireExpenseRole();

  const parsed = expenseInputSchema.safeParse(expenseFormToInput(formData));
  if (!parsed.success) redirect(expensesHref(formData, "error=invalid"));

  const current = await prisma.expense.findFirst({
    where: { id: expenseId, deletedAt: null },
    select: { category: true, partsSharePercent: true },
  });
  if (!current) redirect(expensesHref(formData, "error=notfound"));

  // Editing never touches an assignment the owner made. Only a share that is still the old category's proposal follows a change of category.
  const untouched = current.partsSharePercent === defaultPartsShareFor(current.category);
  const partsSharePercent = untouched ? defaultPartsShareFor(parsed.data.category) : current.partsSharePercent;

  // Editing never drops a receipt already attached: the edit form has no upload, so a missing path means "leave it".
  const { receiptPath, ...fields } = parsed.data;
  await prisma.$transaction(async (tx) => {
    const supplierId = await rememberSupplier(tx, parsed.data.supplier, parsed.data.invoiceStatus, parsed.data.category);
    await tx.expense.updateMany({
      where: { id: expenseId, deletedAt: null },
      data: { ...fields, ...(receiptPath ? { receiptPath } : {}), partsSharePercent, supplierId, spentAt: new Date(`${parsed.data.spentAt}T00:00:00.000Z`) },
    });
  });

  revalidatePath(balancePath);
  redirect(expensesHref(formData, "updated=1"));
}

/** Owner only: how much of an expense is charged to refacciones y materiales; the rest goes to mano de obra. */
export async function assignExpenseShareFromForm(expenseId: string, formData: FormData) {
  await requireSuperAdmin();

  const back = (flag: string) => assignHref(formData, flag);

  const rawShare = formData.get("partsSharePercent");
  // A blank field must not become 0 (all to labor) by accident.
  const parsed = partsShareSchema.safeParse(typeof rawShare === "string" && rawShare.trim() !== "" ? Number(rawShare) : Number.NaN);
  if (!parsed.success) redirect(back("error=invalid"));

  const result = await prisma.expense.updateMany({ where: { id: expenseId, deletedAt: null }, data: { partsSharePercent: parsed.data } });
  if (result.count === 0) redirect(back("error=notfound"));

  revalidatePath(balancePath);
  redirect(back("assigned=1"));
}

/** Soft delete: the row stays for audit but no longer counts anywhere. */
export async function deleteExpenseFromForm(expenseId: string, formData: FormData) {
  await requireExpenseRole();

  await prisma.expense.updateMany({ where: { id: expenseId, deletedAt: null }, data: { deletedAt: new Date() } });

  revalidatePath(balancePath);
  redirect(expensesHref(formData, "deleted=1"));
}

/** Owner only: charge part of a purchase to a note, so its cost counts in the month that note settles. */
export async function linkExpenseToNoteFromForm(expenseId: string, formData: FormData) {
  await requireSuperAdmin();
  const back = (flag: string) => assignHref(formData, flag);

  const noteId = formData.get("payableNoteId");
  const rawAmount = formData.get("amount");
  const amountCents = pesosTextToCents(rawAmount);
  if (typeof noteId !== "string" || noteId === "" || !Number.isInteger(amountCents) || amountCents <= 0) redirect(back("error=invalid"));

  const result = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({ where: { id: expenseId, deletedAt: null }, select: { amountCents: true, allocations: { select: { payableNoteId: true, amountCents: true } } } });
    const note = await tx.payableNote.findFirst({ where: { id: noteId, status: "ISSUED" }, select: { id: true } });
    if (!expense || !note) return "notfound" as const;
    // Replacing the piece already charged to this note is allowed; the total can never pass the purchase.
    const others = expense.allocations.filter((allocation) => allocation.payableNoteId !== noteId).reduce((sum, allocation) => sum + allocation.amountCents, 0);
    if (others + amountCents > expense.amountCents) return "exceeds" as const;
    await tx.expenseAllocation.upsert({
      where: { expenseId_payableNoteId: { expenseId, payableNoteId: noteId } },
      create: { expenseId, payableNoteId: noteId, amountCents },
      update: { amountCents },
    });
    return "ok" as const;
  });

  revalidatePath(balancePath);
  redirect(back(result === "ok" ? "assigned=1" : `error=${result}`));
}

export async function unlinkExpenseFromNoteFromForm(expenseId: string, payableNoteId: string, formData: FormData) {
  await requireSuperAdmin();
  await prisma.expenseAllocation.deleteMany({ where: { expenseId, payableNoteId } });
  revalidatePath(balancePath);
  redirect(assignHref(formData, "assigned=1"));
}

/** Confirm this month's proposal of a recurring expense, with the amount adjusted if it changed (the electricity bill does). */
export async function confirmRecurringExpenseFromForm(recurringId: string, formData: FormData) {
  const { profile } = await requireExpenseRole();
  const month = monthOf(formData);
  const amountCents = pesosTextToCents(formData.get("amount"));
  if (!month || !Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 1_000_000_00) redirect(expensesHref(formData, "error=invalid"));

  const result = await prisma.$transaction(async (tx) => {
    const template = await tx.recurringExpense.findFirst({ where: { id: recurringId, active: true } });
    if (!template) return "notfound" as const;
    const [year, monthNumber] = month.split("-").map(Number);
    const spentAt = new Date(Date.UTC(year, monthNumber - 1, template.dayOfMonth));
    const next = new Date(Date.UTC(year, monthNumber, 1));
    // A double tap or a second tab must not register the month twice.
    const already = await tx.expense.findFirst({ where: { recurringExpenseId: recurringId, deletedAt: null, spentAt: { gte: new Date(Date.UTC(year, monthNumber - 1, 1)), lt: next } }, select: { id: true } });
    if (already) return "ok" as const;
    const supplierId = await rememberSupplier(tx, template.supplier, template.invoiceStatus, template.category);
    await tx.expense.create({
      data: {
        spentAt,
        amountCents,
        category: template.category,
        invoiceStatus: template.invoiceStatus,
        supplier: template.supplier,
        paymentMethod: template.paymentMethod,
        partsSharePercent: defaultPartsShareFor(template.category),
        createdById: profile.id,
        supplierId,
        recurringExpenseId: recurringId,
      },
    });
    return "ok" as const;
  });

  revalidatePath(balancePath);
  redirect(expensesHref(formData, result === "ok" ? "created=1" : "error=notfound"));
}

/** This month's proposal will not be paid: it stops showing as pending, and next month it comes back. */
export async function skipRecurringExpenseFromForm(recurringId: string, formData: FormData) {
  await requireExpenseRole();
  const month = monthOf(formData);
  if (!month) redirect(expensesHref(formData, "error=invalid"));

  await prisma.recurringExpenseSkip.upsert({
    where: { recurringExpenseId_month: { recurringExpenseId: recurringId, month } },
    create: { recurringExpenseId: recurringId, month },
    update: {},
  });
  revalidatePath(balancePath);
  redirect(expensesHref(formData, "skipped=1"));
}

/** Stops proposing it from now on; the expenses already registered stay. */
export async function stopRecurringExpenseFromForm(recurringId: string, formData: FormData) {
  await requireExpenseRole();
  await prisma.recurringExpense.updateMany({ where: { id: recurringId }, data: { active: false } });
  revalidatePath(balancePath);
  redirect(expensesHref(formData, "stopped=1"));
}
