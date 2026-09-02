"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Copy, MessageCircle, Printer, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/features/quotes/lib/format";
import type { WorkerPayrollSummary } from "../domain";
import type { ParsedPayrollParams } from "../period";

interface PayrollWorkerEnvelopeProps {
  worker: WorkerPayrollSummary | null;
  period: ParsedPayrollParams;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollWorkerEnvelopeModal({
  worker,
  period,
  open,
  onOpenChange,
}: PayrollWorkerEnvelopeProps) {
  const [copied, setCopied] = React.useState(false);

  if (!worker) return null;

  const printUrl = `/admin/nomina/imprimir/sobre/${encodeURIComponent(worker.workerId)}?anchor=${encodeURIComponent(period.anchor)}&mode=${encodeURIComponent(period.mode)}`;

  const handlePrint = () => {
    window.open(printUrl, "_blank");
  };

  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const generateTextSummary = () => {
    let text = `*SEBASAM - Recibo de Mano de Obra*\n`;
    text += `*Trabajador:* ${worker.displayName}\n`;
    text += `*Período:* ${period.rangeLabel}\n`;
    text += `*Fecha de emisión:* ${todayStr}\n\n`;
    text += `*DESGLOSE DE TRABAJOS:*\n`;

    worker.workOrders.forEach((order) => {
      text += `\n📌 *${order.workOrderNumber}* (${order.vehicleSummary})\n`;
      order.items.forEach((item) => {
        text += `  • ${item.description}: ${formatCents(item.payrollBaseCents)} (${item.ratePercent}%) = *${formatCents(item.commissionCents)}*\n`;
      });
    });

    text += `\n─────────────────────\n`;
    text += `*Total Mano de Obra Taller:* ${formatCents(worker.totalPayrollBaseCents)}\n`;
    text += `*TOTAL A LIQUIDAR:* *${formatCents(worker.totalCommissionCents)}*\n`;

    return text;
  };

  const handleCopy = async () => {
    const text = generateTextSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(generateTextSummary());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto print:max-w-none print:w-full print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:overflow-visible print:static print:transform-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle>Sobre de Pago - {worker.displayName}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Action Quick Bar (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between gap-2 p-2.5 bg-[var(--color-bg-soft)] rounded-md border border-[var(--color-border-light)] text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">Compartir:</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Envelope Format Wrapper (8.9cm x 16.5cm exact printable envelope proportions) */}
        <div className="flex justify-center w-full">
          <div
            id="payroll-worker-envelope-document"
            className="w-full max-w-[340px] rounded-md border-2 border-slate-900 p-4 bg-white text-slate-900 shadow-sm space-y-3 print:w-[8.9cm] print:max-w-[8.9cm] print:min-h-[16.5cm] print:border-2 print:border-slate-900 print:p-3.5 print:shadow-none print:m-0"
          >
            {/* Header with Logo */}
            <div className="border-b-2 border-slate-900 pb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative h-9 w-9 shrink-0 bg-slate-900 rounded p-1 flex items-center justify-center">
                  <Image
                    src="/logo-white-short.png"
                    alt="Logo de SEBASAM"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-slate-900 leading-none">SEBASAM</h2>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">RECIBO DE NÓMINA</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-medium text-slate-600">Emisión: {todayStr}</p>
              </div>
            </div>

            {/* Worker & Period Info */}
            <div className="bg-slate-100 rounded p-2 border border-slate-200 text-xs">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Trabajador:</span>
                <span className="font-bold text-slate-900 text-xs truncate">{worker.displayName}</span>
              </div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Período:</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate">{period.rangeLabel}</span>
              </div>
            </div>

            {/* Compact Work Items List */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-200/80 border-b border-slate-300 text-slate-800 font-bold text-[10px] uppercase">
                    <th className="py-1.5 px-2">OT / Trabajo</th>
                    <th className="py-1.5 px-1.5 text-right">Base</th>
                    <th className="py-1.5 px-1 text-center">%</th>
                    <th className="py-1.5 px-2 text-right">A Cobrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {worker.workOrders.flatMap((order) =>
                    order.items.map((item, itemIdx) => (
                      <tr key={`${order.workOrderId}-${item.id}`} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2">
                          <div className="font-bold text-slate-900 text-[11px]">
                            {order.workOrderNumber}
                          </div>
                          <div className="text-slate-700 leading-tight font-medium text-[10px]">
                            {item.description}
                          </div>
                          {itemIdx === 0 && (
                            <div className="text-[9px] text-slate-500 truncate max-w-[140px]">
                              {order.vehicleSummary}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-1.5 text-right text-slate-600 align-top font-medium">
                          {formatCents(item.payrollBaseCents)}
                        </td>
                        <td className="py-1.5 px-1 text-center text-slate-500 align-top text-[10px]">
                          {item.ratePercent}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900 align-top">
                          {formatCents(item.commissionCents)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-900 text-white rounded p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-300 uppercase tracking-wider block font-medium">
                  Mano de Obra Taller
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {formatCents(worker.totalPayrollBaseCents)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-emerald-300 uppercase tracking-wider block font-bold">
                  Total a Liquidar
                </span>
                <span className="text-base font-black text-white">
                  {formatCents(worker.totalCommissionCents)}
                </span>
              </div>
            </div>

            {/* Signature on Receipt */}
            <div className="pt-2 border-t border-dashed border-slate-300">
              <div className="h-6 border-b border-slate-800 flex items-end justify-center">
                <span className="text-[9px] text-slate-400 select-none pb-0.5">Firma de conformidad del trabajador</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Actions (Hidden in Print) */}
        <DialogFooter className="flex-row justify-end gap-2 pt-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Imprimir Sobre (16.5 x 8.9 cm)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
