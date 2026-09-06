import type { Metadata } from "next";
import { Suspense } from "react";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams } from "@/features/payroll/period";
import { PayrollSigningSheetDocument } from "@/features/payroll/components/payroll-signing-sheet-document";
import { PrintControls } from "@/features/quotes/components/print-controls";

export const metadata: Metadata = {
  title: "Hoja de Firma de Nómina | SEBASAM",
};

export default async function SigningSheetPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const period = parsePayrollParams(resolvedParams);
  const report = await getWeeklyPayroll(resolvedParams);

  return (
    <div className="bg-white min-h-screen flex flex-col print:min-h-0">
      <Suspense fallback={null}>
        <PrintControls backLabel="Volver a nómina" />
      </Suspense>
      <PayrollSigningSheetDocument report={report} period={period} />
    </div>
  );
}
