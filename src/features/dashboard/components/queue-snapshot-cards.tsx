import Link from "next/link";
import { ArrowRight, ClipboardList, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QueueMetrics } from "../types";

interface QueueSnapshotCardsProps {
  queues: QueueMetrics;
}

export function QueueSnapshotCards({ queues }: QueueSnapshotCardsProps) {
  return (
    <section aria-labelledby="queues-heading">
      <h2 id="queues-heading" className="sr-only">
        Colas operativas en tiempo real
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Commercial Queue Card */}
        <Link
          href="/admin/quotes"
          className="group rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
        >
          <Card className="h-full border-l-4 border-l-[var(--color-warning)] transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle as="h3" className="text-sm font-medium text-[var(--color-text-muted)]">
                Cola Comercial (Cotizaciones)
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold font-mono text-[var(--color-text-main)]">
                  {queues.commercialQueueCount}
                </span>
                <span className="flex items-center text-xs font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">
                  Ver cotizaciones <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Borradores, enviadas o aprobadas pendientes de inicio de trabajo
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Active Execution Queue Card */}
        <Link
          href="/admin/work-orders"
          className="group rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
        >
          <Card className="h-full border-l-4 border-l-[var(--color-primary)] transition-shadow group-hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle as="h3" className="text-sm font-medium text-[var(--color-text-muted)]">
                Ejecución Activa (Taller)
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold font-mono text-[var(--color-text-main)]">
                  {queues.activeExecutionCount}
                </span>
                <span className="flex items-center text-xs font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">
                  Ver trabajos <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Trabajos actualmente asignados o en progreso en taller
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}
