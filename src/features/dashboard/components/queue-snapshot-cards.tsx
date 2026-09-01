import { ClipboardList, FileText } from "lucide-react";
import { MetricCardGroup } from "@/components/ui/metric-card-group";
import type { QueueMetrics } from "../types";
import { QueueMetricCard } from "./queue-metric-card";

interface QueueSnapshotCardsProps {
  queues: QueueMetrics;
}

export function QueueSnapshotCards({ queues }: QueueSnapshotCardsProps) {
  return (
    <section aria-labelledby="queues-heading">
      <h2 id="queues-heading" className="sr-only">
        Colas operativas en tiempo real
      </h2>
      <MetricCardGroup columns={2}>
        {/* Commercial Queue Card */}
        <QueueMetricCard
          label="Cola Comercial (Cotizaciones)"
          value={queues.commercialQueueCount}
          description="Borradores, enviadas o aprobadas pendientes de inicio de trabajo"
          href="/admin/quotes"
          icon={FileText}
          accent="warning"
          ctaLabel="Ver cotizaciones"
        />

        {/* Active Execution Queue Card */}
        <QueueMetricCard
          label="Ejecución Activa (Taller)"
          value={queues.activeExecutionCount}
          description="Trabajos actualmente asignados o en progreso en taller"
          href="/admin/work-orders"
          icon={ClipboardList}
          accent="primary"
          ctaLabel="Ver trabajos"
        />
      </MetricCardGroup>
    </section>
  );
}