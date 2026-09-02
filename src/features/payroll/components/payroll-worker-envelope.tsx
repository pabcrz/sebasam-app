"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Copy, Download, MessageCircle, Printer, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/features/quotes/lib/format";
import { toPng } from "html-to-image";
import { printElementById } from "../lib/print-element";
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
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);

  if (!worker) return null;

  const handlePrint = () => {
    printElementById("payroll-worker-envelope-document", `Sobre de Pago - ${worker.displayName}`);
  };

  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const allLaborItems = worker.workOrders.flatMap((order) => order.items);

  const generateTextSummary = () => {
    let text = `*SEBASAM - Recibo de Mano de Obra*\n`;
    text += `*Trabajador:* ${worker.displayName}\n`;
    text += `*Período:* ${period.rangeLabel}\n`;
    text += `*Fecha de emisión:* ${todayStr}\n\n`;
    text += `*DESGLOSE DE TRABAJOS:*\n`;

    allLaborItems.forEach((item) => {
      text += `  • ${item.description}: Base ${formatCents(item.payrollBaseCents)} ➔ *${formatCents(item.commissionCents)}*\n`;
    });

    text += `\n─────────────────────\n`;
    text += `*Mano de Obra Taller:* ${formatCents(worker.totalPayrollBaseCents)}\n`;
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

  const handleDownloadImage = async () => {
    const node = document.getElementById("payroll-worker-envelope-document");
    if (!node) return;
    setIsGeneratingImage(true);
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
        cacheBust: true,
      });
      const link = document.createElement("a");
      const safeName = worker.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.download = `recibo-nomina-${safeName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error exportando imagen de sobre:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto print:max-w-none print:w-full print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:overflow-visible print:static print:transform-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle>Sobre de Pago - {worker.displayName}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Action Quick Bar with Image Download (Hidden in Print) */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[var(--color-bg-soft)] rounded-md border border-[var(--color-border-light)] text-xs">
          <span className="text-[var(--color-text-muted)] font-medium">Compartir:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="h-8 gap-1 text-xs"
              title="Descargar imagen PNG para enviar"
            >
              {isGeneratingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-[var(--color-primary)]" />}
              <span>Imagen</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-8 gap-1 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </Button>
          </div>
        </div>

        {/* Centered Envelope Format Wrapper (8.9cm x 16.5cm exact printable envelope proportions) */}
        <div className="flex justify-center w-full py-1">
          <div
            id="payroll-worker-envelope-document"
            className="w-full max-w-[340px] rounded-lg border-2 border-slate-900 p-4 bg-white text-slate-900 shadow-md space-y-3.5 print:w-[8.9cm] print:max-w-[8.9cm] print:min-h-[16.5cm] print:border-2 print:border-slate-900 print:p-3.5 print:shadow-none print:m-0 print:break-inside-avoid"
          >
            {/* Header with Clean Inverted Logo (No dark box) */}
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
