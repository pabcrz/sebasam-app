"use client";

import * as React from "react";
import { Check, Copy, MessageCircle, Printer, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  // Generate WhatsApp formatted text
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle>Sobre de Pago - {worker.displayName}</DialogTitle>
          </div>
          <DialogDescription>
            Recibo individual con descripciones sencillas de mano de obra y precios de taller para entregar o enviar al trabajador.
          </DialogDescription>
        </DialogHeader>

        {/* Action Quick Bar */}
        <div className="flex items-center justify-between gap-2 p-2.5 bg-[var(--color-bg-soft)] rounded-md border border-[var(--color-border-light)] text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">Compartir con el trabajador:</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar Resumen"}
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

        {/* Printable Pay Envelope Slip */}
        <div
          id="payroll-worker-envelope-document"
          className="rounded-md border border-slate-300 p-6 bg-white text-slate-900 shadow-sm space-y-4 print:border-none print:p-0 print:shadow-none"
        >
          {/* Slip Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">SEBASAM</h2>
              <p className="text-[11px] text-slate-600">Servicio Básico a Suspensiones y Aire y Muelles</p>
              <p className="text-xs font-semibold text-slate-800 mt-1">RECIBO DE NÓMINA INDIVIDUAL</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{worker.displayName}</p>
              <p className="text-[11px] text-slate-600">Período: {period.rangeLabel}</p>
              <p className="text-[10px] text-slate-500">Emisión: {todayStr}</p>
            </div>
          </div>

          {/* Simple Labor Items Breakdown */}
          <div className="space-y-3">
            <div className="border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-2 px-3">OT / Vehículo</th>
                    <th className="py-2 px-3">Mano de Obra (Taller)</th>
                    <th className="py-2 px-2 text-right">Base Taller</th>
                    <th className="py-2 px-2 text-center">%</th>
                    <th className="py-2 px-3 text-right">A Cobrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {worker.workOrders.flatMap((order) =>
                    order.items.map((item, itemIdx) => (
                      <tr key={`${order.workOrderId}-${item.id}`} className="hover:bg-slate-50/80">
                        {itemIdx === 0 ? (
                          <td
                            rowSpan={order.items.length}
                            className="py-2 px-3 font-medium text-slate-800 align-top border-r border-slate-100 bg-slate-50/40"
                          >
                            <div>{order.workOrderNumber}</div>
                            <div className="text-[10px] text-slate-500 font-normal truncate max-w-[140px]">
                              {order.vehicleSummary}
                            </div>
                          </td>
                        ) : null}
                        <td className="py-2 px-3 text-slate-800 font-medium">
                          {item.description}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {formatCents(item.payrollBaseCents)}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-500 font-medium">
                          {item.ratePercent}%
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatCents(item.commissionCents)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Box */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-600 block">Total Mano de Obra Taller</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatCents(worker.totalPayrollBaseCents)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                  Total a Entregar
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCents(worker.totalCommissionCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Signature Line */}
          <div className="pt-4 border-t border-dashed border-slate-300 flex items-center justify-between text-xs">
            <div className="text-[11px] text-slate-500">
              Recibí a mi entera satisfacción la cantidad indicada.
            </div>
            <div className="w-56 text-center">
              <div className="border-b border-slate-800 pb-0.5"></div>
              <p className="text-[10px] text-slate-700 font-semibold mt-1">Firma del Trabajador</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Imprimir Sobre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
