"use client";

import * as React from "react";
import Image from "next/image";
import { Download, MessageCircle, Printer, Mail, Loader2 } from "lucide-react";
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
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = React.useState(false);
  const [shareStatus, setShareStatus] = React.useState<string | null>(null);

  if (!worker) return null;

  const handlePrint = () => {
    printElementById("payroll-worker-envelope-document", `Recibo de Nómina - ${worker.displayName}`);
  };

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

  const generateEnvelopePngDataUrl = async (): Promise<string | null> => {
    const node = document.getElementById("payroll-worker-envelope-document");
    if (!node) return null;

    return await toPng(node, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
      style: {
        margin: "0",
        transform: "none",
      },
    });
  };

  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    try {
      const dataUrl = await generateEnvelopePngDataUrl();
      if (!dataUrl) return;

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

  const handleWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    setShareStatus(null);
    try {
      const dataUrl = await generateEnvelopePngDataUrl();
      if (!dataUrl) throw new Error("No se pudo generar la imagen del recibo.");

      const safeName = worker.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `recibo-nomina-${safeName}.png`, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Recibo de Nómina - ${worker.displayName}`,
        });
        return;
      }

      const link = document.createElement("a");
      link.download = file.name;
      link.href = dataUrl;
      link.click();
      setShareStatus("Imagen descargada. Adjuntala manualmente en WhatsApp.");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Error al compartir imagen por WhatsApp:", err);
        setShareStatus("No se pudo compartir la imagen. Descargala e intentá adjuntarla manualmente.");
      }
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 w-[calc(100vw-2rem)] max-w-[460px] max-h-[92vh] gap-3 p-2 sm:p-3 overflow-y-auto overflow-x-hidden print:max-w-none print:w-full print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:overflow-visible print:static print:transform-none">
        <DialogHeader className="print:hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle className="min-w-0 break-words">Recibo de Nómina - {worker.displayName}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Flush Envelope Preview */}
        <div className="flex min-w-0 max-w-full justify-center py-1">
          <div
            id="payroll-worker-envelope-document"
            className="w-[360px] max-w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm space-y-4 print:box-border print:w-full print:max-w-none print:min-h-[237mm] print:space-y-5 print:rounded-none print:border-none print:p-[14mm_18mm] print:m-0 print:shadow-none print:break-inside-avoid"
          >
            {/* Header with Clean Inverted Logo */}
            <div className="border-b-2 border-slate-900 pb-3 print:pb-3 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div className="relative h-9 w-9 shrink-0 flex items-center justify-center print:h-10 print:w-10">
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
            <div className="bg-slate-50 rounded-md p-3 print:p-3 border border-slate-200 text-xs space-y-1 print:space-y-1 print:break-inside-avoid">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Trabajador:</span>
                <span className="font-black text-slate-900 text-xs truncate">{worker.displayName}</span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Período:</span>
                <span className="font-semibold text-slate-800 text-[11px] truncate">{period.rangeLabel}</span>
              </div>
            </div>

            {/* Compact envelope table - In print: no thead, no lines, minimal vertical padding */}
            <div className="border border-slate-200 rounded-md overflow-hidden print:break-inside-avoid">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="print:table-header-group">
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold text-[10px] uppercase tracking-wide">
                    <th className="py-2 pl-2.5 pr-1 text-left">Mano de Obra</th>
                    <th className="py-2 px-0.5 text-center w-7 text-[9px] font-bold text-slate-600">%</th>
                    <th className="py-2 pl-1 pr-2.5 text-right w-16 text-[10px] font-bold text-slate-900">A Cobrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {allLaborItems.length > 0 ? (
                    allLaborItems.map((item, idx) => (
                      <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                        <td className="break-words py-2 pl-2.5 pr-1 text-xs font-semibold leading-tight text-slate-900 print:py-0.5 print:leading-none">
                          {item.description}
                        </td>
                        <td className="py-2 print:py-0.5 print:leading-none px-0.5 text-center text-slate-400 font-normal text-[10px] whitespace-nowrap">
                          {item.ratePercent}%
                        </td>
                        <td className="py-2 print:py-0.5 print:leading-none pl-1 pr-2.5 text-right font-medium text-slate-950 text-xs whitespace-nowrap">
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

            {/* Light Totals Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 print:p-3 flex items-center justify-between print:break-inside-avoid">
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

        {/* Action Sharing Bar (Single row below receipt, matching width) */}
        <div className="print:hidden w-full max-w-[350px] mx-auto p-2 bg-[var(--color-bg-soft)] rounded-md border border-[var(--color-border-light)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[var(--color-text-muted)] font-semibold shrink-0">Compartir:</span>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={isGeneratingImage || isSharingWhatsApp}
              className="h-8 min-w-0 gap-1.5 text-xs w-full justify-center"
              title="Descargar imagen PNG para enviar"
            >
              {isGeneratingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-[var(--color-primary)]" />}
              <span>Imagen</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              disabled={isGeneratingImage || isSharingWhatsApp}
              className="h-8 min-w-0 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold w-full justify-center"
              title="Compartir imagen por WhatsApp"
            >
              {isSharingWhatsApp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5" />
              )}
              <span>WhatsApp</span>
            </Button>
          </div>
          {shareStatus ? <p className="basis-full text-[11px] text-[var(--color-text-muted)]">{shareStatus}</p> : null}
        </div>

        {/* Dialog Actions (Hidden in Print) */}
        <DialogFooter className="flex-row flex-wrap justify-end gap-2 pt-1 print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Imprimir en hoja Carta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
