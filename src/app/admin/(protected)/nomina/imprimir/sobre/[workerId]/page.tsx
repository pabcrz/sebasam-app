import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getWeeklyPayroll } from "@/features/payroll/queries";
import { parsePayrollParams } from "@/features/payroll/period";
import { PayrollWorkerEnvelopeDocument } from "@/features/payroll/components/payroll-worker-envelope-document";
import { PrintControls } from "@/features/quotes/components/print-controls";

interface WorkerEnvelopePrintPageProps {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workerId: string }>;
}): Promise<Metadata> {
  const { workerId } = await params;
  return {
    title: `Sobre de Pago - ${decodeURIComponent(workerId)} | SEBASAM`,
  };
}

export default async function WorkerEnvelopePrintPage(props?: WorkerEnvelopePrintPageProps) {
  const [{ workerId }, resolvedParamsRaw] = await Promise.all([
    props?.params ?? Promise.resolve({ workerId: "" }),
    props?.searchParams ?? Promise.resolve({}),
  ]);
  const resolvedParams = resolvedParamsRaw ?? {};
  const decodedWorkerId = decodeURIComponent(workerId);
  const period = parsePayrollParams(resolvedParams);
  const report = await getWeeklyPayroll(resolvedParams);

  const worker = report.workers.find((w) => w.workerId === decodedWorkerId);

  if (!worker) {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen flex flex-col justify-start print:min-h-0">
      <Suspense fallback={null}>
        <PrintControls backLabel="Volver a nómina" />
      </Suspense>
      <PayrollWorkerEnvelopeDocument worker={worker} period={period} />
    </div>
  );
}
