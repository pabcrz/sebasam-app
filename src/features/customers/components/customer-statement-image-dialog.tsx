"use client";

import * as React from "react";
import { toPng } from "html-to-image";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import type { CustomerDetailedStatement } from "../customer-statement-queries";
import { formatDocumentPdfFilename, formatUtcDateDDMMAAAA } from "@/features/quotes/lib/pdf-filename";
import { CustomerStatementDocument } from "./customer-statement-document";

const DOCUMENT_ID = "customer-statement-image-document";

type CustomerStatementImageDialogProps = {
  statement: CustomerDetailedStatement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Shows the statement document and exports that same markup as a PNG, like the payroll receipt. */
export function CustomerStatementImageDialog({ statement, open, onOpenChange }: CustomerStatementImageDialogProps) {
  const [busy, setBusy] = React.useState<"download" | "share" | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const customerName = statement.customer.commercialName || statement.customer.name;
  const fileName = `${formatDocumentPdfFilename({
    customerName,
    folio: `EstadoDeCuenta-${formatUtcDateDDMMAAAA(statement.emissionDate)}`,
  })}.png`;

  async function renderPng() {
    const node = document.getElementById(DOCUMENT_ID);
    if (!node) throw new Error("No se encontró el documento.");
    return toPng(node, { backgroundColor: "#ffffff", pixelRatio: 2, cacheBust: true, style: { margin: "0", transform: "none" } });
  }

  function download(dataUrl: string) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  }

  async function handleDownload() {
    setBusy("download");
    setStatus(null);
    try {
      download(await renderPng());
    } catch {
      setStatus("No se pudo generar la imagen. Intenta de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    setStatus(null);
    try {
      const dataUrl = await renderPng();
      const file = new File([await (await fetch(dataUrl)).blob()], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Estado de cuenta - ${customerName}` });
        return;
      }
      download(dataUrl);
      setStatus("Imagen descargada. Adjúntala manualmente en WhatsApp.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setStatus("No se pudo compartir la imagen. Descárgala y adjúntala manualmente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-[860px] gap-3 overflow-y-auto p-3">
        <DialogHeader>
          <DialogTitle>Estado de cuenta como imagen</DialogTitle>
          <DialogDescription>Es el mismo documento que se imprime. Descárgalo o compártelo por WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-md border border-[var(--color-border-light)]">
          <div className="min-w-[760px]">
            <CustomerStatementDocument statement={statement} id={DOCUMENT_ID} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {status ? <p className="mr-auto text-xs text-[var(--color-text-muted)]" role="status">{status}</p> : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button type="button" variant="outline" onClick={handleDownload} disabled={busy !== null} loading={busy === "download"}>
            <Icon name="download" className="h-4 w-4" aria-hidden="true" />
            Descargar imagen
          </Button>
          <Button type="button" variant="primary" onClick={handleShare} disabled={busy !== null} loading={busy === "share"}>
            <Icon name="message-circle" className="h-4 w-4" aria-hidden="true" />
            Compartir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
