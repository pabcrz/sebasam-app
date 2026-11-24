"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { EXPENSE_CATEGORIES } from "./categories";
import { partsShareSchema } from "./schemas";

const screen = "/admin/configuracion-pago/porcentajes-gastos";

/** Owner only: the share each category proposes for the parts account. Only new expenses use it; the ones already registered keep theirs. */
export async function saveCategorySharesAction(formData: FormData) {
  await requireSuperAdmin();

  const shares = EXPENSE_CATEGORIES.map((category) => {
    const raw = formData.get(`share-${category.value}`);
    // A blank field must not become 0 (all to labor) by accident.
    const parsed = partsShareSchema.safeParse(typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN);
    return { category, percent: parsed.success ? parsed.data : null };
  });
  if (shares.some((share) => share.percent === null)) redirect(`${screen}?error=invalid`);

  await prisma.$transaction(
    shares.map(({ category, percent }) =>
      // Back to the default means no override, so a later change of the default reaches this category.
      percent === category.defaultPartsSharePercent
        ? prisma.expenseCategoryShare.deleteMany({ where: { category: category.value } })
        : prisma.expenseCategoryShare.upsert({ where: { category: category.value }, create: { category: category.value, partsSharePercent: percent! }, update: { partsSharePercent: percent! } }),
    ),
  );

  revalidatePath(screen);
  redirect(`${screen}?saved=1`);
}
