"use client";

import * as React from "react";
import { Check, Copy, LinkIcon } from "lucide-react";
import type { PaymentRequest } from "@prisma/client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

export interface PaymentRequestLinkDialogProps {
  action: () => Promise<PaymentRequest>;
  quoteNumber: string;
}

export function PaymentRequestLinkDialog({ action, quoteNumber }: PaymentRequestLinkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [request, setRequest] = React.useState<PaymentRequest | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpen = React.useCallback(() => {
    setOpen(true);
    setRequest(null);
    setError(null);
  }, []);

  const handleGenerate = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await action();
      setRequest(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el link de pago.");
    } finally {
      setIsLoading(false);
    }
  }, [action]);

  const paymentUrl = request ? `/datos-de-pago/${request.token}` : null;
  const absoluteUrl =
    paymentUrl && typeof window !== "undefined"
      ? `${window.location.origin}${paymentUrl}`
      : (paymentUrl ?? "");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        aria-label="Link de pago"
      >
        <LinkIcon className="h-4 w-4" aria-hidden="true" />
        <span>Link de pago</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de pago</DialogTitle>
            <DialogDescription>
              Genera o recupera el enlace de pago para {quoteNumber}.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p
              className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {request ? (
            <div className="space-y-3">
              <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
                <p className="text-xs font-medium text-[var(--color-text-muted)]">
                  URL para el cliente
                </p>
                <p className="mt-1 break-all text-sm font-medium text-[var(--color-text-main)]">
                  {absoluteUrl}
                </p>
              </div>
              <CopyButton value={absoluteUrl} />
            </div>
          ) : null}

          <DialogFooter>
            {request ? (
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="button" onClick={handleGenerate} loading={isLoading}>
                  Generar link
                </Button>
              </>
            )}
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
