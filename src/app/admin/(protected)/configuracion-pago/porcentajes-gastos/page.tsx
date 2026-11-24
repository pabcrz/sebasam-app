import type { Metadata } from "next";
import { CategorySharesForm } from "@/features/balance/components/category-shares-form";
import { saveCategorySharesAction } from "@/features/balance/expenses/category-share-actions";
import { getCategoryShares } from "@/features/balance/expenses/category-shares";
import { SettingsScreen } from "@/features/payment-settings/components/settings-screen";
import { requireSuperAdminForPage } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Porcentajes de gastos",
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ExpenseSharesPage({ searchParams }: PageProps) {
  await requireSuperAdminForPage();
  const params = (await searchParams) ?? {};
  const notice = params.saved ? { tone: "success" as const, text: "Porcentajes guardados." } : params.error ? { tone: "danger" as const, text: "Cada porcentaje debe ser un número entero de 0 a 100." } : null;

  return (
    <SettingsScreen title="Porcentajes de gastos">
      <CategorySharesForm shares={await getCategoryShares()} action={saveCategorySharesAction} notice={notice} />
    </SettingsScreen>
  );
}
