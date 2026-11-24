import type { ExpenseCategory, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultPartsShareFor, EXPENSE_CATEGORIES } from "./categories";

type Client = Pick<Prisma.TransactionClient, "expenseCategoryShare">;

/** The share each category charges to the parts account today: the owner's setting where there is one, else the code's default. */
export async function getCategoryShares(client: Client = prisma): Promise<Record<ExpenseCategory, number>> {
  const overrides = await client.expenseCategoryShare.findMany({ select: { category: true, partsSharePercent: true } });
  const shares = Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category.value, category.defaultPartsSharePercent])) as Record<ExpenseCategory, number>;
  for (const override of overrides) shares[override.category] = override.partsSharePercent;
  return shares;
}

export async function categoryShareFor(client: Client, category: ExpenseCategory) {
  const override = await client.expenseCategoryShare.findUnique({ where: { category }, select: { partsSharePercent: true } });
  return override?.partsSharePercent ?? defaultPartsShareFor(category);
}
