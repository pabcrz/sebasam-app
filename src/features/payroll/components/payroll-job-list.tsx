"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { PayrollJobRow, WeeklyPayrollReport } from "../domain";
import { getPayrollJobRows } from "../domain";
import { PayrollOrderAccordionRow } from "./payroll-worker-detail";

function money(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
}

function dateLabel(value: Date | string | null) {
  return value ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value)) : "Sin fecha";
}

export function PayrollJobList({ report }: { report: WeeklyPayrollReport }) {
  const [masterId, setMasterId] = React.useState("all");
  const rows = getPayrollJobRows(report, masterId);
  const masters = report.workers.filter((worker) => worker.workerKind !== "SPECIAL");

  return (
    <Card data-testid="payroll-job-list" className="min-w-0 overflow-hidden p-0">
      <CardHeader className="border-b border-[var(--color-border-light)] p-2 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle as="h2" className="text-base sm:text-lg">Trabajos del período</CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">Ordenados cronológicamente. Abre un trabajo para revisar sus conceptos.</p>
          </div>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--color-text-muted)]">
            Maestro
            <select aria-label="Filtrar por maestro" value={masterId} onChange={(event) => setMasterId(event.target.value)} className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)]">
              <option value="all">Todos los maestros</option>
              {masters.map((master) => <option key={master.workerId} value={master.workerId}>{master.displayName}</option>)}
            </select>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 p-0 sm:space-y-2">
        {rows.length === 0 ? <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No hay trabajos para este filtro.</p> : rows.map((row) => <PayrollJobCard key={row.order.workOrderId} row={row} />)}
      </CardContent>
    </Card>
  );
}

function PayrollJobCard({ row }: { row: PayrollJobRow }) {
  const [open, setOpen] = React.useState(false);
  const { order } = row;
  const printHref = `/admin/notas/${order.workOrderId}/print?returnTo=/admin/nomina`;
  return (
    <article className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)]">
      <div className="flex min-w-0 flex-col gap-1.5 p-2 sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={`${open ? "Cerrar" : "Abrir"} detalle de ${order.quoteTitle}`} className="flex min-w-0 flex-1 items-start gap-2 text-left sm:gap-3">
           <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-[var(--color-text-main)] sm:text-base">{order.quoteTitle}</span><span className="mt-1 block break-words text-xs text-[var(--color-text-muted)]">{order.workOrderNumber} · {order.clientName} · {dateLabel(order.completedAt)} · {order.vehicleSummary} · {row.masterName}</span></span>
          <span className="mt-0.5 shrink-0 text-[var(--color-text-muted)]">{open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}</span>
        </button>
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5"><span className="text-xs text-[var(--color-text-muted)]">{order.items.length} {order.items.length === 1 ? "concepto" : "conceptos"}</span><strong className="text-sm text-emerald-600 dark:text-emerald-400">{money(order.totalCommissionCents)}</strong><Button asChild variant="ghost" size="icon" className="ml-auto min-h-11 min-w-11" title="Ver nota"><a href={printHref} aria-label={`Ver nota ${order.workOrderNumber}`}><Eye aria-hidden="true" /></a></Button></div>
      </div>
      {open && <PayrollOrderAccordionRow order={order} defaultOpen showHeader={false} />}
    </article>
  );
}
