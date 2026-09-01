"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  Textarea,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui";
import { formatCents, formatDate } from "@/features/quotes/lib/format";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  OTHER: "Otro",
};

export interface ReversePaymentDialogProps {
  paymentId: string;
  amountCents: number;
  method?: string;
  paymentDate?: Date | string;
  reference?: string;
  action: (paymentId: string, reason: string, operationKey?: string) => Promise<unknown>;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerLabel?: string;
  triggerIconOnly?: boolean;
  className?: string;
  onSuccess?: () => void;
}

export function ReversePaymentDialog({
  paymentId,
  amountCents,
  method = "CASH",
  paymentDate,
  reference,
  action,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerLabel = "Revertir",
  triggerIconOnly = false,
  className,
  onSuccess,
}: ReversePaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const formattedDate = paymentDate
    ? formatDate(typeof paymentDate === "string" ? new Date(paymentDate) : paymentDate)
    : null;
  const methodLabel = PAYMENT_METHOD_LABELS[method] ?? method;

  function handleOpen(event: React.MouseEvent) {
    event.stopPropagation();
    setReason("");
    setReasonError(null);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError("Ingresa el motivo de la reversión.");
      return;
    }
    setReasonError(null);

    setIsLoading(true);

    try {
      const operationKey = crypto.randomUUID();
      await action(paymentId, trimmedReason, operationKey);
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revertir el pago. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerIconOnly ? "icon" : triggerSize}
        ref={triggerRef}
        onClick={handleOpen}
        aria-label={`Revertir pago de ${formatCents(amountCents)}`}
        title={`Revertir pago de ${formatCents(amountCents)}`}
        className={className}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {!triggerIconOnly ? <span>{triggerLabel}</span> : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isLoading) setOpen(nextOpen);
        }}
      >
        <DialogMobileContent
          className="max-w-md"
          onEscapeKeyDown={(event) => {
            if (isLoading) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (isLoading) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <DialogMobileHeader>
            <DialogTitle>Revertir pago</DialogTitle>
            <DialogDescription>
              Esta acción anulará el pago, generará los contra-asientos correspondientes en el libro mayor y recalculará el saldo del cliente.
            </DialogDescription>
            <DialogMobileClose aria-label="Cerrar reversión de pago" disabled={isLoading} />
          </DialogMobileHeader>

          <DialogMobileBody>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--color-text-muted)]">Monto a revertir</span>
                  <span className="font-semibold text-[var(--color-text-main)] tabular-nums">
                    {formatCents(amountCents)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--color-text-muted)]">Método</span>
                  <span className="font-medium text-[var(--color-text-main)]">{methodLabel}</span>
                </div>
                {formattedDate && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Fecha</span>
                    <span className="text-[var(--color-text-main)]">{formattedDate}</span>
                  </div>
                )}
                {reference && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Referencia</span>
                    <span className="font-mono text-xs text-[var(--color-text-main)]">{reference}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor={`reversal-reason-${paymentId}`}
                  className="text-sm font-medium text-[var(--color-text-main)]"
                >
                  Motivo de reversión <span className="text-[var(--color-status-danger-fg)]">*</span>
                </label>
                <Textarea
                  id={`reversal-reason-${paymentId}`}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (e.target.value.trim()) setReasonError(null);
                  }}
                  placeholder="Ej. Error de captura en monto, pago duplicado, cheque devuelto..."
                  disabled={isLoading}
                  rows={3}
                  aria-invalid={reasonError ? "true" : undefined}
                  aria-describedby={reasonError ? `reversal-reason-error-${paymentId}` : undefined}
                />
                {reasonError && (
                  <p
                    id={`reversal-reason-error-${paymentId}`}
                    className="text-xs text-[var(--color-status-danger-fg)]"
                    role="alert"
                  >
                    {reasonError}
                  </p>
                )}
              </div>

              {error && (
                <div
                  className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] p-3 text-sm text-[var(--color-status-danger-fg)]"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Confirmar reversión
                </Button>
              </div>
            </form>
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}
