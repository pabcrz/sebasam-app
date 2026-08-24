import type { Metadata } from "next";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams } from "@/features/payroll/period";
import { PayrollView } from "@/features/payroll/components/payroll-view";

export const metadata: Metadata = {
  title: "Nómina Semanal | SEBASAM",
  description: "Cálculo y liquidación semanal de mano de obra por órdenes completadas.",
};

export default async function NominaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const period = parsePayrollParams(resolvedParams);
  const report = await getWeeklyPayroll(resolvedParams);

  return (
    <section className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <PayrollView report={report} period={period} />
    </section>
  );
}
