"use client";

import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/features/quotes/lib/format";
import { Badge } from "@/components/ui/badge";
import { ListRow } from "@/components/ui/list-row";
import { SectionLabel } from "@/components/ui/section-label";
import type { WorkerPayrollSummary } from "../domain";

interface PayrollOverviewTableProps {
  workers: WorkerPayrollSummary[];
  onSelectWorker: (workerId: string) => void;
}

/** One whole-row button per worker; the amount to pay sits on the right. Tapping a row opens its detail sheet. */
export function PayrollOverviewTable({ workers, onSelectWorker }: PayrollOverviewTableProps) {
  if (workers.length === 0) return null;

  return (
    <section data-testid="payroll-overview-table" className="grid min-w-0 max-w-full gap-3">
      <SectionLabel>Resumen General de Nómina</SectionLabel>
      <ul className="grid gap-2">
        {workers.map((worker) => (
          <li key={worker.workerId}>
            <ListRow
              openLabel={`Ver detalle de ${worker.displayName}`}
              onOpen={() => onSelectWorker(worker.workerId)}
              decision={
                <span className="grid justify-items-end gap-0.5">
                  <span className="font-semibold tabular-nums text-[var(--color-amount)]">
                    {formatCents(worker.totalCommissionCents)}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {worker.completedOrderCount} {worker.completedOrderCount === 1 ? "orden" : "órdenes"}
                  </span>
                </span>
              }
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)]">
                <Icon name="user-check" className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 max-w-full flex-col items-start gap-1">
                <span className="max-w-full break-words text-sm font-semibold text-[var(--color-text-main)]">
                  {worker.displayName}
                </span>
                <Badge variant="default" className="px-1.5 py-0 text-[10px] font-normal">
                  {worker.workerKind === "SPECIAL" ? "Especial" : "Maestro"}
                </Badge>
              </span>
            </ListRow>
          </li>
        ))}
      </ul>
    </section>
  );
}
