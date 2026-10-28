import * as React from "react";
import Image from "next/image";
import type { WeeklyPayrollReport } from "../domain";
import type { ParsedPayrollParams } from "../period";

interface SigningSheetDocumentProps {
  report: WeeklyPayrollReport;
  period: ParsedPayrollParams;
  customWorkers?: Array<{ id: string; name: string }>;
}

export function PayrollSigningSheetDocument({
  report,
  period,
  customWorkers = [],
}: SigningSheetDocumentProps) {
  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const allWorkers = [
    ...report.workers.map((w) => ({
      id: w.workerId,
      name: w.displayName,
    })),
    ...(report.fixedPayHelpers ?? []).map((helper) => ({
      id: helper.workerId,
      name: helper.displayName,
    })),
    ...customWorkers.map((r) => ({
      id: r.id,
      name: r.name,
    })),
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-8 sm:p-12 bg-white text-slate-900 space-y-6 print:p-0 print:max-w-none print:w-full">
      {/* Header with Inverted Logo without black box */}
      <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative h-11 w-11 shrink-0 flex items-center justify-center">
            <Image
              src="/logo-white-short.png"
              alt="Logo de SEBASAM"
              width={44}
              height={44}
              className="object-contain invert"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">SEBASAM</h1>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Hoja de Firma de Nómina ({period.mode === "monthly" ? "Mensual" : "Semanal"})
          </h2>
          <p className="text-xs font-medium text-slate-700">
            Período: <span className="font-bold text-slate-900">{period.rangeLabel}</span>
          </p>
          <p className="text-[11px] text-slate-500">Fecha de Emisión: {todayStr}</p>
        </div>
      </div>

      {/* Table (Clean 3 columns: No., Nombre del Trabajador, Firma de Conformidad) */}
      <div className="overflow-hidden border border-slate-300 rounded">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wide">
              <th className="py-3.5 px-4 w-16 text-center">No.</th>
              <th className="py-3.5 px-6">Nombre del Trabajador</th>
              <th className="py-3.5 px-8 w-80 text-center">Firma de Conformidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {allWorkers.length > 0 ? (
              allWorkers.map((worker, idx) => (
                <tr key={worker.id} className="h-16">
                  <td className="py-3.5 px-4 text-center font-bold text-slate-600 text-sm">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-6">
                    {worker.name ? (
                      <span className="font-bold text-base text-slate-900 block">
                        {worker.name}
                      </span>
                    ) : (
                      <div className="border-b border-dotted border-slate-400 h-6 w-full max-w-[280px]" />
                    )}
                  </td>
                  <td className="py-3.5 px-8">
                    <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center">
                      <span className="text-[10px] text-slate-400 pb-0.5 select-none">Firma</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500">
                  No hay trabajadores con trabajos registrados en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Legal Notice */}
      <div className="pt-2">
        <p className="text-xs text-slate-600 italic leading-relaxed text-center sm:text-left">
          * Al plasmar su firma en este documento, cada trabajador manifiesta su entera conformidad con la recepción del sobre/recibo correspondiente al período indicado y la correcta liquidación de sus trabajos de mano de obra.
        </p>
      </div>
    </div>
  );
}
