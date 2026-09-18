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

  const allLaborItems = worker.workOrders.flatMap((order) => {
    if (order.isAdvance) {
      return [
        {
          id: order.advanceId ?? `adv-${order.workOrderId}-${order.quoteItemId}`,
          description: `[Avance] ${order.conceptDescription || "Mano de obra"} (${order.workOrderNumber})`,
          payrollBaseCents: order.advanceBaseCents ?? order.totalPayrollBaseCents,
          ratePercent: order.commissionRatePercent ?? 50,
          commissionCents: order.totalCommissionCents,
        },
      ];
    }
    return order.items.map((item) => ({
      id: item.id,
      description:
        order.previousAdvancesBaseCents && order.previousAdvancesBaseCents > 0
          ? `${item.description} (Liq. ${order.workOrderNumber})`
          : item.description,
      payrollBaseCents: item.remainingBaseCents ?? item.payrollBaseCents,
      ratePercent: item.ratePercent,
      commissionCents: item.commissionCents,
    }));
  });

  return (
    <div className="flex flex-col items-center justify-start p-1 sm:p-4 print:p-0 print:m-0 print:block">
      <div
        id="payroll-worker-envelope-document"
        className="w-[360px] max-w-full px-4 py-3 bg-white text-slate-900 space-y-3 print:space-y-1.5 mx-auto rounded-none print:w-[8.9cm] print:max-w-[8.9cm] print:min-h-[16.5cm] print:p-0 print:m-0 print:border-none print:shadow-none print:break-inside-avoid"
      >
        {/* Header with Inverted Logo */}
        <div className="border-b-2 border-slate-900 pb-2 print:pb-1 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 flex items-center justify-center">
              <Image
                src="/logo-white-short.png"
                alt="Logo de SEBASAM"
                width={32}
                height={32}
                className="object-contain invert"
                priority
              />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 leading-none">SEBASAM</h2>
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">RECIBO DE NÓMINA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-600">{todayStr}</p>
          </div>
        </div>

        {/* Worker & Period Info */}
        <div className="bg-slate-50 rounded-md p-2.5 print:p-1.5 border border-slate-200 text-xs space-y-0.5 print:space-y-0">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Trabajador:</span>
            <span className="font-bold text-slate-900 text-xs truncate">{worker.displayName}</span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Período:</span>
            <span className="font-semibold text-slate-800 text-[11px] truncate">{period.rangeLabel}</span>
          </div>
        </div>

        {/* Cohesive 4-Column Table - In print: no thead, no line divides, minimal vertical padding */}
        <div className="border border-slate-200 rounded-md overflow-hidden print:border-none print:rounded-none">
          <table className="w-full text-left border-collapse">
            <thead className="print:hidden">
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide">
                <th className="py-2 pl-2.5 pr-1 text-left">Mano de Obra</th>
                <th className="py-2 px-1 text-right w-14 text-[9px] font-bold text-slate-600">Base</th>
                <th className="py-2 px-0.5 text-center w-7 text-[9px] font-bold text-slate-600">%</th>
                <th className="py-2 pl-1 pr-2.5 text-right w-16 text-[10px] font-bold text-slate-900">A Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-y-0">
              {allLaborItems.length > 0 ? (
                allLaborItems.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="py-2 print:py-0.5 pl-2.5 pr-1 text-slate-800 font-medium text-xs leading-tight">
                      {item.description}
                    </td>
                    <td className="py-2 print:py-0.5 px-1 text-right text-slate-500 font-normal text-[10px] whitespace-nowrap">
                      {formatCents(item.payrollBaseCents)}
                    </td>
                    <td className="py-2 print:py-0.5 px-0.5 text-center text-slate-400 font-normal text-[10px] whitespace-nowrap">
                      {item.ratePercent}%
                    </td>
                    <td className="py-2 print:py-0.5 pl-1 pr-2.5 text-right font-medium text-slate-950 text-xs whitespace-nowrap">
                      {formatCents(item.commissionCents)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                    Sin conceptos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Light Totals Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 print:p-1.5 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-wider block font-bold text-slate-500">
              Mano de Obra Taller:
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {formatCents(worker.totalPayrollBaseCents)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider block font-bold text-slate-900">
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
