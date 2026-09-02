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

  return (
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-4rem)] p-4 sm:p-8 print:p-0 print:m-0 print:min-h-0 print:block">
      <div
        id="payroll-worker-envelope-document"
        className="w-[8.9cm] max-w-[8.9cm] min-h-[16.5cm] rounded-md border-2 border-slate-900 p-4 bg-white text-slate-900 shadow-md space-y-3.5 mx-auto print:w-[8.9cm] print:max-w-[8.9cm] print:min-h-[16.5cm] print:border-2 print:border-slate-900 print:p-3.5 print:shadow-none print:m-0 print:break-inside-avoid"
      >
        {/* Header with Logo */}
        <div className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 shrink-0 bg-slate-900 rounded p-1 flex items-center justify-center">
              <Image
                src="/logo-white-short.png"
                alt="Logo de SEBASAM"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 leading-none">SEBASAM</h2>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mt-0.5">RECIBO DE NÓMINA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-slate-600">Emisión: {todayStr}</p>
          </div>
        </div>

        {/* Worker & Period Info */}
        <div className="bg-slate-100 rounded p-2.5 border border-slate-200 text-xs space-y-1">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-600">Trabajador:</span>
            <span className="font-bold text-slate-900 text-xs truncate">{worker.displayName}</span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-600">Período:</span>
            <span className="font-semibold text-slate-800 text-[11px] truncate">{period.rangeLabel}</span>
          </div>
        </div>

        {/* Compact Work Items List */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-200/90 border-b border-slate-300 text-slate-800 font-bold text-[10px] uppercase tracking-wide">
                <th className="py-2 px-2.5">OT / Trabajo</th>
                <th className="py-2 px-2 text-right">Base</th>
                <th className="py-2 px-1.5 text-center">%</th>
                <th className="py-2 px-2.5 text-right">A Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {worker.workOrders.flatMap((order) =>
                order.items.map((item, itemIdx) => (
                  <tr key={`${order.workOrderId}-${item.id}`} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-slate-900 text-[11px]">
                        {order.workOrderNumber}
                      </div>
                      <div className="text-slate-800 leading-tight font-medium text-[10px]">
                        {item.description}
                      </div>
                      {itemIdx === 0 && (
                        <div className="text-[9px] text-slate-500 truncate max-w-[140px] mt-0.5">
                          {order.vehicleSummary}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-700 align-top font-medium text-[11px]">
                      {formatCents(item.payrollBaseCents)}
                    </td>
                    <td className="py-2 px-1.5 text-center text-slate-600 align-top text-[10px] font-medium">
                      {item.ratePercent}%
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900 align-top text-[11px]">
                      {formatCents(item.commissionCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="bg-slate-900 text-white rounded p-3 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] text-slate-300 uppercase tracking-wider block font-semibold">
              Mano de Obra Taller
            </span>
            <span className="text-xs font-bold text-slate-200">
              {formatCents(worker.totalPayrollBaseCents)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-emerald-300 uppercase tracking-wider block font-black">
              Total a Liquidar
            </span>
            <span className="text-base font-black text-white">
              {formatCents(worker.totalCommissionCents)}
            </span>
          </div>
        </div>

        {/* Signature on Receipt */}
        <div className="pt-2 border-t border-dashed border-slate-300">
          <div className="h-7 border-b border-slate-800 flex items-end justify-center">
            <span className="text-[9px] text-slate-500 font-medium select-none pb-0.5">Firma de conformidad del trabajador</span>
          </div>
        </div>
      </div>
    </div>
  );
}
