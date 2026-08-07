import type { Metadata } from \"next\";
import { FileCheck } from \"lucide-react\";
import { listCompletedWorkOrders } from \"@/features/work-orders/queries\";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from \"@/components/ui\";
import { WorkOrderCompletedList } from \"@/features/work-orders/components/work-order-completed-list\";

export const metadata: Metadata = {
  title: \"Notas de remisión\",
};

export default async function NotasPage() {
  const workOrders = await listCompletedWorkOrders();

  return (
    <section className=\"mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10\">
      <Card>
        <CardHeader>
          <div className=\"flex items-center gap-3\">
            <div className=\"flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]\">
              <FileCheck className=\"h-5 w-5\" aria-hidden=\"true\" />
            </div>
            <div>
              <CardDescription>Trabajos finalizados</CardDescription>
              <CardTitle as=\"h1\">Notas de remisión</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className=\"max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]\">
            Historial de trabajos completados. Desde aquí podés imprimir la Nota de Remisión de cada entrega.
          </p>
        </CardContent>
      </Card>

      <Card className=\"min-w-0\">
        <CardHeader>
          <CardTitle as=\"h2\">Trabajos completados</CardTitle>
        </CardHeader>
        <CardContent className=\"min-w-0\">
          {workOrders.length === 0 ? (
            <div className=\"py-10 text-center\">
              <p className=\"text-sm text-[var(--color-text-muted)]\">
                Todavía no hay trabajos finalizados.
              </p>
            </div>
          ) : (
            <WorkOrderCompletedList workOrders={workOrders} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
