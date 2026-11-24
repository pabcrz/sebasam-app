import type { Metadata } from "next";
import { BalanceView } from "@/features/balance/components/balance-view";
import { getBalanceSnapshot } from "@/features/balance/queries";

export const metadata: Metadata = {
  title: "Balance",
  description: "Ingresos cobrados y cuentas por cobrar.",
};

export default async function BalancePage() {
  const snapshot = await getBalanceSnapshot();

  return (
    <section className="mx-auto grid min-w-0 w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <BalanceView snapshot={snapshot} />
    </section>
  );
}
