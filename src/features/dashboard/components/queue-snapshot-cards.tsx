import { CheckCircle2, ClipboardList, FilePenLine, Send } from "lucide-react";
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
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <QueueMetricCard
          label="Enviar cotizaciones borrador"
          value={queues.draftQuotesCount}
          href="/admin/quotes?status=DRAFT"
          icon={FilePenLine}
          accent="warning"
        />
        <QueueMetricCard
          label="Dar seguimiento a cotizaciones enviadas"
          value={queues.sentQuotesCount}
          href="/admin/quotes?status=SENT"
          icon={Send}
          accent="info"
        />
        <QueueMetricCard
          label="Asignar o iniciar trabajos aprobados"
          value={queues.approvedQuotesCount}
          href="/admin/quotes?status=APPROVED"
          icon={CheckCircle2}
          accent="success"
        />
        <QueueMetricCard
          label="Completar trabajos activos"
          value={queues.activeExecutionCount}
          href="/admin/work-orders"
          icon={ClipboardList}
          accent="primary"
        />
      </div>
    </section>
  );
}
