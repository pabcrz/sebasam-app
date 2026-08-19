import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { listActiveMasters } from "@/features/workers/queries";
import { listCustomers } from "@/features/customers/queries";
import { listOperationalWorks } from "@/features/operations/queries";
import { createOperationalWorkFromForm } from "@/features/operations/actions";
import { OperationalWorkForm } from "@/features/operations/components/operational-work-form";
import { OperationalWorkList } from "@/features/operations/components/operational-work-list";

export const metadata: Metadata = { title: "Trabajos operativos" };

export default async function OperationsPage() {
  const [works, masters, customers] = await Promise.all([listOperationalWorks(), listActiveMasters(), listCustomers()]);
  return <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-6 md:py-10">
    <Card><CardHeader><CardTitle as="h1">Trabajos operativos</CardTitle></CardHeader><CardContent><p className="max-w-2xl text-sm text-[var(--color-text-muted)]">Registra reportes y conceptos de trabajo antes de completar la información comercial.</p></CardContent></Card>
    <OperationalWorkForm action={createOperationalWorkFromForm} masters={masters} customers={customers} />
    <div className="grid gap-3"><h2 className="text-lg font-bold">Trabajos registrados</h2><OperationalWorkList works={works} /></div>
  </section>;
}
