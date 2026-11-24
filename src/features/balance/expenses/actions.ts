"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  };
}

/** Back to the expenses tab of the month the user was looking at; never to an arbitrary address. */
function expensesHref(formData: FormData, flag: string) {
  const month = formData.get("month");
  const valid = typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  return `${balancePath}?tab=gastos${valid ? `&month=${month}` : ""}&${flag}`;
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

  // Whoever registers does not choose how the expense is split: the category proposes it and the owner assigns it later.
  await prisma.expense.create({
    data: {
      ...parsed.data,
      partsSharePercent: defaultPartsShareFor(parsed.data.category),
      spentAt: new Date(`${parsed.data.spentAt}T00:00:00.000Z`),
      createdById: profile.id,
    },
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

  await prisma.expense.updateMany({
    where: { id: expenseId, deletedAt: null },
    data: { ...parsed.data, partsSharePercent, spentAt: new Date(`${parsed.data.spentAt}T00:00:00.000Z`) },
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
