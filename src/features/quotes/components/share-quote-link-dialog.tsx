"use client";

import * as React from "react";
import { Check, Copy, LinkIcon } from "lucide-react";
import type { SharedQuote } from "@prisma/client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

export interface ShareQuoteLinkDialogProps {
  sharedQuote: SharedQuote;
  quoteNumber: string;
}

export function ShareQuoteLinkDialog({ sharedQuote, quoteNumber }: ShareQuoteLinkDialogProps) {
  const [open, setOpen] = React.useState(false);

  const shareUrl = `/cotizacion/${sharedQuote.token}`;
  const absoluteUrl =
    typeof window !== "undefined" ? `${window.location.origin}${shareUrl}` : shareUrl;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Ver link de cotización ${quoteNumber}`}
      >
        <LinkIcon className="h-4 w-4" aria-hidden="true" />
        <span>Ver link</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link de cotización</DialogTitle>
            <DialogDescription>
              Enlace público de solo lectura para {quoteNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs font-medium text-[var(--color-text-muted)]">URL para el cliente</p>
              <p className="mt-1 break-all text-sm font-medium text-[var(--color-text-main)]">{absoluteUrl}</p>
            </div>
            <CopyButton value={absoluteUrl} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fallback; user can still select and copy manually.
    }
  }, [value]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "Copiado" : "Copiar link al portapapeles"}
      className="w-full"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span>{copied ? "Copiado" : "Copiar link"}</span>
    </Button>
  );
}
