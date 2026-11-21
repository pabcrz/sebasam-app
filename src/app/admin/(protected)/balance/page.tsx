import type { Metadata } from "next";
import { parseCustomerStatementParams } from "@/features/customers/customer-statement";
import { getIncomeBalance } from "@/features/balance/queries";
import { BalanceView } from "@/features/balance/components/balance-view";

export const metadata: Metadata = {
  title: "Balance",
};

type BalancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BalancePage({ searchParams }: BalancePageProps) {
  const now = new Date();
  // Same Mexico City periods as the customer statement: Monday-to-Sunday weeks, calendar months and years.
  const { period, anchor, rangeLabel, start, end } = parseCustomerStatementParams(
    { ...(await searchParams), view: "history" },
    now,
  );
  const balance = await getIncomeBalance({ start, end }, now);

  return (
    <section className="mx-auto grid w-full min-w-0 max-w-4xl gap-4 px-4 py-6 pb-28 sm:pb-10 md:px-6 md:py-10">
      <BalanceView balance={balance} period={period} anchor={anchor} rangeLabel={rangeLabel} today={now} />
    </section>
  );
}
