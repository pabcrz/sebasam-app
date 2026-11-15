import type { Metadata } from "next";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams } from "@/features/payroll/period";
import { PayrollView } from "@/features/payroll/components/payroll-view";
import { requireProfileForPage } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Nómina | SEBASAM",
  description: "Cálculo y liquidación de nómina de mano de obra por órdenes completadas.",
};

export default async function NominaPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await props?.searchParams) ?? {};
  const { profile } = await requireProfileForPage();
  const payrollParams = profile.role === "ADMIN" ? { ...resolvedParams, mode: "weekly" } : resolvedParams;
  const period = parsePayrollParams(payrollParams);
  const report = await getWeeklyPayroll(payrollParams);

  return (
    <section className="mx-auto grid min-w-0 w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <PayrollView report={report} period={period} role={profile.role} />
    </section>
  );
}
