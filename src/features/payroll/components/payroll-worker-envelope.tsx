"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadElementPng, shareElementPng } from "@/lib/share-image";
import { PayrollWorkerEnvelopeDocument } from "./payroll-worker-envelope-document";
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


  const fileName = `recibo-nomina-${worker.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;

  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    try {
      await downloadElementPng("payroll-worker-envelope-document", fileName);
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
      setShareStatus(
        await shareElementPng("payroll-worker-envelope-document", fileName, `Recibo de Nómina - ${worker.displayName}`),
      );
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 w-[calc(100vw-2rem)] max-w-[460px] max-h-[92vh] gap-3 p-2 sm:p-3 overflow-y-auto overflow-x-hidden print:max-w-none print:w-full print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:overflow-visible print:static print:transform-none">
        <DialogHeader className="print:hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Icon name="mail" className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle className="min-w-0 break-words">Recibo de Nómina - {worker.displayName}</DialogTitle>
          </div>
        </DialogHeader>

        <PayrollWorkerEnvelopeDocument worker={worker} period={period} />

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
              className="min-w-0 gap-1.5 text-xs w-full justify-center"
              title="Descargar imagen PNG para enviar"
            >
              {isGeneratingImage ? <Icon name="loader" className="h-3.5 w-3.5 animate-spin" /> : <Icon name="download" className="h-3.5 w-3.5 text-[var(--color-primary)]" />}
              <span>Imagen</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              disabled={isGeneratingImage || isSharingWhatsApp}
              className="min-w-0 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold w-full justify-center"
              title="Compartir imagen por WhatsApp"
            >
              {isSharingWhatsApp ? (
                <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon name="message-circle" className="h-3.5 w-3.5" />
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
            <Icon name="print" className="h-4 w-4" />
            Imprimir en hoja Carta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
