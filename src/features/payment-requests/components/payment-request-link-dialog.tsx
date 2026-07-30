"use client";

import * as React from "react";
import Link from "next/link";
import { Banknote, Check, Copy, ExternalLink, FileText, LinkIcon } from "lucide-react";
import type { PaymentRequest, PaymentRequestStatus } from "@prisma/client";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";

export type PaymentRequestDialogBankAccount = {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
};

export type PaymentRequestDialogContext = {
  quoteNumber: string;
  title: string;
  customerName: string;
  vehicleDescription: string;
  workOrderNumber: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  requiresInvoice: boolean;
  paymentRequestStatus: PaymentRequestStatus | null;
  fiscalProfile: { businessName: string; taxId: string } | null;
  fiscalActionHref: string | null;
  bankAccount: PaymentRequestDialogBankAccount | null;
};

export interface PaymentRequestLinkDialogProps {
  action: () => Promise<PaymentRequest>;
  context: PaymentRequestDialogContext;
}

const paymentRequestStatusLabels: Partial<Record<PaymentRequestStatus, string>> = {
  PENDING: "Pendiente",
  VIEWED: "Visto",
  FISCAL_DATA_REQUIRED: "Datos fiscales pendientes",
  READY_TO_PAY: "Listo para pago",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

export function PaymentRequestLinkDialog({ action, context }: PaymentRequestLinkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [request, setRequest] = React.useState<PaymentRequest | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const quoteNumber = context.quoteNumber;
  const shouldReviewFiscalData = context.requiresInvoice && !context.fiscalProfile;

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
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Link de pago</DialogTitle>
            <DialogDescription>
              Genera o recupera el enlace de pago para {quoteNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)]">
              <div className="bg-[image:var(--gradient-primary)] px-4 py-3 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Cotización {quoteNumber}</p>
                <h3 className="mt-1 text-base font-bold leading-tight sm:text-lg">{context.title || "Sin título"}</h3>
              </div>
              <div className="grid gap-3 p-4">
                <div className="grid gap-2 text-sm">
                  <SummaryRow label="Cliente" value={context.customerName || "Sin cliente"} />
                  <SummaryRow label="Unidad" value={context.vehicleDescription || "Sin vehículo"} />
                  {context.workOrderNumber ? <SummaryRow label="Orden" value={context.workOrderNumber} /> : null}
                </div>

                <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
                  <AmountRow label="Subtotal" value={context.subtotalCents} />
                  <AmountRow label="IVA" value={context.taxCents} />
                  <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-2 text-base font-bold text-[var(--color-primary)]">
                    <span>Total</span>
                    <span>{formatCents(context.totalCents)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={context.requiresInvoice ? "info" : "default"}>
                    {context.requiresInvoice ? "Factura requerida" : "Sin factura"}
                  </Badge>
                  {context.paymentRequestStatus ? (
                    <Badge variant={context.paymentRequestStatus === "FISCAL_DATA_REQUIRED" ? "warning" : "default"}>
                      {paymentRequestStatusLabels[context.paymentRequestStatus] ?? context.paymentRequestStatus}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </section>

            {context.requiresInvoice ? (
              <section className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--color-text-main)]">Datos fiscales</h3>
                    {context.fiscalProfile ? (
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {context.fiscalProfile.businessName} · RFC {context.fiscalProfile.taxId}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Esta cotización requiere factura y todavía no hay perfil fiscal registrado para el cliente.
                      </p>
                    )}
                  </div>
                </div>
                {shouldReviewFiscalData && context.fiscalActionHref ? (
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full sm:w-fit">
                    <Link href={context.fiscalActionHref}>Revisar cliente</Link>
                  </Button>
                ) : null}
              </section>
            ) : null}

            {context.bankAccount ? (
              <section className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
                  <h3 className="font-semibold text-[var(--color-text-main)]">Cuenta bancaria</h3>
                </div>
                <div className="grid gap-2">
                  <BankField label="Titular" value={context.bankAccount.accountHolder} />
                  <BankField label="Banco" value={context.bankAccount.bankName} />
                  {context.bankAccount.accountNumber.trim() ? (
                    <BankField label="No. cuenta" value={context.bankAccount.accountNumber} copyable />
                  ) : null}
                  {context.bankAccount.clabe.trim() ? (
                    <BankField label="CLABE" value={context.bankAccount.clabe} copyable />
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

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
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(absoluteUrl).catch(() => {});
                  window.open(absoluteUrl, "_blank", "noopener,noreferrer");
                }}
                aria-label={`Copiar y abrir link de ${quoteNumber}`}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span>Copiar y abrir</span>
              </Button>
              <CopyButton value={absoluteUrl} className="w-full" />
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</span>
      <span className="min-w-0 break-words font-medium text-[var(--color-text-main)]">{value}</span>
    </div>
  );
}

function AmountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
      <span>{label}</span>
      <span className="tabular-nums">{formatCents(value)}</span>
    </div>
  );
}

function BankField({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
        <p className="break-all text-sm font-semibold text-[var(--color-text-main)]">{value}</p>
      </div>
      {copyable ? <CopyButton value={value.replace(/\s/g, "")} label={`Copiar ${label}`} /> : null}
    </div>
  );
}

function CopyButton({
  value,
  label = "Copiar link",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
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
      aria-label={copied ? "Copiado" : `${label} al portapapeles`}
      className={className ?? "shrink-0"}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span>{copied ? "Copiado" : label}</span>
    </Button>
  );
}
