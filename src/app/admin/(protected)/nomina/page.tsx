import type { Metadata } from "next";
import { Banknote } from "lucide-react";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams } from "@/features/payroll/period";
import { PayrollView } from "@/features/payroll/components/payroll-view";

export const metadata: Metadata = {
  title: "Nómina | SEBASAM",
  description: "Cálculo y liquidación de nómina de mano de obra por órdenes completadas.",
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
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <AdminPageHeader
        icon={Banknote}
        title="Nómina"
        description="Cálculo y liquidación de nómina de mano de obra por órdenes completadas."
        variant="expanded"
      />
      <PayrollView report={report} period={period} />
    </section>
  );
}
