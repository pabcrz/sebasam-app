"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/features/quotes/lib/format";
import { buildWeeklyPayrollPresentation, type WeeklyPayrollReport } from "../domain";
import { printElementById } from "../lib/print-element";

export function WeeklyPayrollSummary({ report }: { report: WeeklyPayrollReport }) {
  const [mode, setMode] = React.useState<"normal" | "adjusted">("normal");
  const presentation = buildWeeklyPayrollPresentation(report, mode);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <label htmlFor="weekly-payroll-presentation" className="text-sm font-medium">Presentación</label>
        <select
          id="weekly-payroll-presentation"
          value={mode}
          onChange={(event) => setMode(event.target.value as "normal" | "adjusted")}
          className="h-9 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 text-sm"
        >
          <option value="normal">Normal</option>
          <option value="adjusted">Ajustada</option>
        </select>
        <Button type="button" onClick={() => printElementById("weekly-payroll-summary-document", "Resumen semanal de nómina")}
          aria-label="Imprimir resumen semanal de nómina">
          Imprimir / PDF
        </Button>
      </div>

      <article id="weekly-payroll-summary-document" className="hidden overflow-x-auto bg-white p-4 text-slate-900 print:block">
        <header className="mb-1 flex items-center gap-2">
          <Image
            src="/logo-white-short.png"
            alt="Logo de SEBASAM"
            width={32}
            height={32}
            className="object-contain invert"
            priority
          />
          <h2 className="text-lg font-bold">Resumen semanal de nómina</h2>
        </header>
        <p className="mb-4 text-sm">{report.rangeLabel} · {mode === "normal" ? "Normal" : "Ajustada"}</p>
        <table className="w-full border-collapse text-left text-xs">
          <thead><tr>
            <th className="border-b border-slate-300 px-2 py-2 font-semibold">Fecha</th><th className="border-b border-slate-300 px-2 py-2 font-semibold">Trabajo / concepto</th>
            <th className="border-b border-slate-300 px-2 py-2 font-semibold">Importe</th>
            {report.workers.map((worker) => <th key={worker.workerId} className="border-b border-slate-300 px-2 py-2 font-semibold">{worker.displayName}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-200">
            {presentation.rows.map((row, index) => <tr key={`${row.workOrderNumber}-${index}`}>
              <td className="px-2 py-2">{new Intl.DateTimeFormat("es-MX").format(new Date(row.completedAt))}</td>
              <td className="px-2 py-2">{row.workOrderNumber} · {row.description}</td>
              <td className="px-2 py-2">{formatCents(row.amountCents)}</td>
              {report.workers.map((worker) => <td key={worker.workerId} className="px-2 py-2">
                {row.workerAmountsCents[worker.workerId] ? formatCents(row.workerAmountsCents[worker.workerId]) : "—"}
              </td>)}
            </tr>)}
            <tr className="font-semibold"><td className="px-2 py-2" colSpan={3}>Total por trabajador</td>
              {report.workers.map((worker) => <td key={worker.workerId} className="px-2 py-2">{formatCents(presentation.workerTotalsCents[worker.workerId] ?? 0)}</td>)}
            </tr>
            <tr className="font-bold"><td className="px-2 py-2" colSpan={3}>Pago</td>
              {report.workers.map((worker) => <td key={worker.workerId} className="px-2 py-2">{formatCents(presentation.workerPaymentCents[worker.workerId] ?? 0)}</td>)}
            </tr>
          </tbody>
        </table>
        {(report.fixedPayHelpers?.length ?? 0) > 0 && <section className="mt-6">
          <h3 className="mb-2 font-bold">Ayudantes generales · sueldo fijo semanal</h3>
          <table className="w-full border-collapse text-left text-xs">
            <thead><tr><th className="border-b border-slate-300 px-2 py-2 font-semibold">Ayudante</th><th className="border-b border-slate-300 px-2 py-2 font-semibold">Sueldo semanal</th>
              <th className="border-b border-slate-300 px-2 py-2 font-semibold">Faltas</th><th className="border-b border-slate-300 px-2 py-2 font-semibold">Descuento</th>
              <th className="border-b border-slate-300 px-2 py-2 font-semibold">Comisión manual</th><th className="border-b border-slate-300 px-2 py-2 font-semibold">Total a liquidar</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{report.fixedPayHelpers!.map((helper) => <tr key={helper.workerId}>
              <td className="px-2 py-2">{helper.displayName}</td><td className="px-2 py-2">{formatCents(helper.weeklyRateCents)}</td>
              <td className="px-2 py-2">{helper.absenceDays}</td><td className="px-2 py-2">{formatCents(helper.absenceDeductionCents)}</td>
              <td className="px-2 py-2">{formatCents(helper.manualCommissionCents)}</td><td className="px-2 py-2">{formatCents(helper.totalPayableCents)}</td>
            </tr>)}</tbody>
          </table>
        </section>}
      </article>
    </section>
  );
}
