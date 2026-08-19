import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { listActiveMasters } from "@/features/workers/queries";
import { listCustomers } from "@/features/customers/queries";
import { getOperationalWorkById } from "@/features/operations/queries";
import { convertOperationalWorkFromForm, updateOperationalWorkFromForm } from "@/features/operations/actions";
import { OperationalWorkForm } from "@/features/operations/components/operational-work-form";

export default async function OperationalWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [work, masters, customers] = await Promise.all([getOperationalWorkById(id), listActiveMasters(), listCustomers()]);
  if (!work) notFound();
  const updateAction = updateOperationalWorkFromForm.bind(null, work.id);
  return <section className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-6 md:px-6 md:py-10">
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle as="h1">{work.number}</CardTitle>{work.convertedQuote ? <Button asChild variant="outline"><a href={`/admin/quotes/${work.convertedQuote.id}/edit`}>Abrir cotización</a></Button> : <form action={convertOperationalWorkFromForm}><input type="hidden" name="operationalWorkId" value={work.id} /><Button type="submit" variant="secondary">Convertir a borrador</Button></form>}</div></CardHeader><CardContent><p className="text-sm text-[var(--color-text-muted)]">Estado: {work.status === "OPEN" ? "Abierto" : "Convertido"}</p></CardContent></Card>
    {work.status === "OPEN" ? <OperationalWorkForm action={updateAction} masters={masters} customers={customers} initial={work} /> : <Card><CardContent className="grid gap-4 pt-6"><p className="font-semibold">Reporte</p><p className="whitespace-pre-wrap text-sm">{work.report ?? "Sin reporte"}</p><p className="font-semibold">Notas</p><p className="whitespace-pre-wrap text-sm">{work.notes ?? "Sin notas"}</p><p className="font-semibold">Conceptos</p><ul className="list-disc pl-5 text-sm">{work.concepts.map((concept) => <li key={concept.id}>{concept.description} · {String(concept.quantity)}</li>)}</ul></CardContent></Card>}
  </section>;
}
