import * as React from "react";
import Image from "next/image";
import { formatCents } from "@/features/quotes/lib/format";
import type { WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";

interface EnvelopeDocumentProps {
  worker: WorkerPayrollSummary;
  period: ParsedPayrollParams;
}

export function PayrollWorkerEnvelopeDocument({
  worker,
  period,
}: EnvelopeDocumentProps) {
  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const allLaborItems = worker.workOrders.flatMap((order) => order.items);

  return (
    <div className="flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:m-0 print:block">
      <div
        id="payroll-worker-envelope-document"
        className="w-[8.9cm] max-w-[8.9cm] min-h-[16.5cm] rounded-lg border-2 border-slate-900 p-4 bg-white text-slate-900 shadow-md space-y-3.5 mx-auto print:w-[8.9cm] print:max-w-[8.9cm] print:min-h-[16.5cm] print:border-2 print:border-slate-900 print:p-3.5 print:shadow-none print:m-0 print:break-inside-avoid"
      >
        {/* Header with Clean Inverted Logo (No dark background box) */}
        <div className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 shrink-0 flex items-center justify-center">
              <Image
                src="/logo-white-short.png"
                alt="Logo de SEBASAM"
                width={36}
                height={36}
                className="object-contain invert"
                priority
              />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 leading-none">SEBASAM</h2>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">RECIBO DE NÓMINA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-600">{todayStr}</p>
          </div>
        </div>

        {/* Worker & Period Info */}
        <div className="bg-slate-100/90 rounded-md p-2.5 border border-slate-200 text-xs space-y-1">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Trabajador:</span>
            <span className="font-black text-slate-900 text-xs truncate">{worker.displayName}</span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Período:</span>
            <span className="font-semibold text-slate-800 text-[11px] truncate">{period.rangeLabel}</span>
          </div>
        </div>

        {/* Labor Table with Base and A Cobrar (Without %) */}
        <div className="border border-slate-300 rounded-md overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-[10px] uppercase tracking-wide">
                <th className="py-2 px-2.5">Mano de Obra</th>
                <th className="py-2 px-2 text-right w-20">Base</th>
                <th className="py-2 px-2.5 text-right w-20">A Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allLaborItems.length > 0 ? (
                allLaborItems.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2.5 text-slate-800 font-medium text-[11px] leading-snug">
                      {item.description}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600 font-medium text-[11px] whitespace-nowrap">
                      {formatCents(item.payrollBaseCents)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900 text-xs whitespace-nowrap">
                      {formatCents(item.commissionCents)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-500 text-xs">
                    Sin conceptos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Light Totals Summary (No Dark Background) */}
        <div className="bg-slate-50 border border-slate-300 rounded-md p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider block font-bold text-slate-500">
              Mano de Obra Taller:
            </span>
            <span className="text-xs font-bold text-slate-800">
              {formatCents(worker.totalPayrollBaseCents)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider block font-black text-slate-900">
              Total a Liquidar:
            </span>
            <span className="text-base font-black text-slate-900">
              {formatCents(worker.totalCommissionCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
