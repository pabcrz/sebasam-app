\"use client\";

import * as React from \"react\";
import Link from \"next/link\";
import { ClipboardList } from \"lucide-react\";
import type { listActiveWorkOrders } from \"@/features/work-orders/queries\";
import type { listActiveWorkers } from \"@/features/workers/queries\";
import { Badge, Button } from \"@/components/ui\";
import { formatCents } from \"@/features/quotes/lib/format\";

type WorkOrderItem = Awaited<ReturnType<typeof listActiveWorkOrders>>[number];
type WorkerOption = Awaited<ReturnType<typeof listActiveWorkers>>[number];

interface WorkOrderActiveListProps {
  workOrders: WorkOrderItem[];
  workers: WorkerOption[];
}

function formatVehicle(wo: WorkOrderItem) {
  const v = wo.quote.vehicle;
  if (!v) return \"Sin vehículo\";
  return [v.brand, v.model, v.year, v.plate ? `· ${v.plate}` : null].filter(Boolean).join(\" \");
}

function AssigneeBadge({ wo }: { wo: WorkOrderItem }) {
  if (wo.isSpecial) {
    return (
      <Badge variant=\"warning\" className=\"w-fit\">
        {wo.specialAssigneeName ?? \"Orden especial\"}
      </Badge>
    );
  }
  const master = wo.assignments.find((a) => a.worker.workerKind === \"MASTER\");
  if (master) {
    return <span className=\"text-sm font-medium\">{master.worker.displayName}</span>;
  }
  return <span className=\"text-sm text-[var(--color-text-muted)]\">Sin asignar</span>;
}

export function WorkOrderActiveList({ workOrders }: WorkOrderActiveListProps) {
  return (
    <div className=\"grid gap-3 lg:grid-cols-2\">
      {workOrders.map((wo) => (
        <div
          key={wo.id}
          className=\"rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm\"
        >
          <div className=\"mb-3 flex items-start justify-between gap-2\">
            <div>
              <div className=\"flex flex-wrap items-center gap-2\">
                <span className=\"font-mono text-xs font-semibold text-[var(--color-text-muted)]\">{wo.number}</span>
                <Badge variant=\"info\" className=\"w-fit\">En proceso</Badge>
              </div>
              <p className=\"mt-1 font-semibold text-[var(--color-text-main)]\">{wo.quote.customer.name}</p>
              <p className=\"text-sm text-[var(--color-text-muted)]\">{formatVehicle(wo)}</p>
            </div>
            <div className=\"text-right\">
              <p className=\"font-mono text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]\">
                {formatCents(Number(wo.quote.totalCents))}
              </p>
              <p className=\"text-xs text-[var(--color-text-muted)]\">{wo.quote.title}</p>
            </div>
          </div>

          <div className=\"mb-3 flex items-center gap-2 text-sm\">
            <span className=\"text-[var(--color-text-muted)]\">Maestro:</span>
            <AssigneeBadge wo={wo} />
            {wo.assignments.filter((a) => a.worker.workerKind === \"HELPER\").length > 0 ? (
              <span className=\"text-xs text-[var(--color-text-muted)]\">
                + {wo.assignments.filter((a) => a.worker.workerKind === \"HELPER\").length} ayudante(s)
              </span>
            ) : null}
          </div>

          <div className=\"flex gap-2\">
            <Button
              type=\"button\"
              variant=\"outline\"
              size=\"sm\"
              className=\"flex-1\"
              asChild
            >
              <Link href={`/admin/work-orders/${wo.id}`}>
                <ClipboardList className=\"h-4 w-4\" aria-hidden=\"true\" />
                Gestionar
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
