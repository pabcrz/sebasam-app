import type { Metadata } from "next";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams } from "@/features/payroll/period";
import { PayrollGeneralPrint } from "@/features/payroll/components/payroll-general-print";
import { PrintControls } from "@/features/quotes/components/print-controls";

export const metadata: Metadata = { title: "Nómina general | SEBASAM" };

export default async function GeneralPayrollPrintPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [period, report] = [parsePayrollParams(params), await getWeeklyPayroll(params)];
  return <><PrintControls backLabel="Volver a nómina" backHref="/admin/nomina" /><PayrollGeneralPrint report={report} period={period} /></>;
}
