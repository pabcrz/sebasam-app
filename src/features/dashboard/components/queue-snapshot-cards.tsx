import { ClipboardList, FileText } from "lucide-react";
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Commercial Queue Card */}
        <QueueMetricCard
          label="Cotizaciones pendientes"
          value={queues.commercialQueueCount}
          href="/admin/quotes"
          icon={FileText}
          accent="warning"
        />

        {/* Active Execution Queue Card */}
        <QueueMetricCard
          label="Trabajos activos"
          value={queues.activeExecutionCount}
          href="/admin/work-orders"
          icon={ClipboardList}
          accent="primary"
        />
      </div>
    </section>
  );
}