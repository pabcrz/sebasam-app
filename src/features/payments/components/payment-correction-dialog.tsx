"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import type { CorrectPaymentResult } from "@/features/payments/domain";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  OTHER: "Otro",
};

const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS);

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseAmountCents(value: string): { cents: number; error: string | null } {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    return { cents: 0, error: "Ingresa un monto válido con hasta dos decimales." };
  }
  const [whole, fractional = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return { cents: 0, error: "El monto de corrección debe ser mayor que cero." };
  }
  return { cents, error: null };
}

export interface PaymentCorrectionDialogProps {
  paymentId: string;
  originalAmountCents: number;
  originalMethod: string;
  reference?: string;
  paymentDate?: Date | string | null;
  quoteNumber?: string;
  action: (
    paymentId: string,
    amount: string,
    method: string,
    reason: string,
    operationKey: string,
  ) => Promise<CorrectPaymentResult>;
  onSuccess?: () => void;
}

export function PaymentCorrectionDialog({
  paymentId,
  originalAmountCents,
  originalMethod,
  reference,
  paymentDate,
  quoteNumber,
  action,
  onSuccess,
}: PaymentCorrectionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [amount, setAmount] = React.useState(centsToInput(originalAmountCents));
  const [method, setMethod] = React.useState(originalMethod);
  const [reason, setReason] = React.useState("");
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [reasonError, setReasonError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CorrectPaymentResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [operationKey, setOperationKey] = React.useState<string | null>(null);
  const router = useRouter();

  const originalMethodLabel = PAYMENT_METHOD_LABELS[originalMethod] ?? originalMethod;
  const formattedDate = paymentDate
    ? formatDate(typeof paymentDate === "string" ? new Date(paymentDate) : paymentDate)
    : null;

  function resetForm() {
    setAmount(centsToInput(originalAmountCents));
    setMethod(originalMethod);
    setReason("");
    setAmountError(null);
    setReasonError(null);
    setError(null);
    setResult(null);
    setOperationKey(crypto.randomUUID());
  }

  function handleOpen() {
    setOpen(true);
    resetForm();
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setAmountError(parseAmountCents(value).error);
    setError(null);
  }

  function handleReasonChange(value: string) {
    setReason(value);
    if (value.trim()) setReasonError(null);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = parseAmountCents(amount);
    if (parsed.error) {
      setAmountError(parsed.error);
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError("El motivo de la corrección es obligatorio.");
      return;
    }

    if (!operationKey) {
      setError("No se pudo iniciar la operación. Cierra y vuelve a abrir el formulario.");
      return;
    }

    setIsLoading(true);

    try {
      const correction = await action(paymentId, amount, method, trimmedReason, operationKey);
      setResult(correction);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo corregir el pago. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        ref={triggerRef}
        onClick={handleOpen}
        aria-label={`Corregir pago de ${formatCents(originalAmountCents)}`}
        title={`Corregir pago de ${formatCents(originalAmountCents)}`}
        className="h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3"
      >
        <PenLine className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Corregir pago</span>
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!isLoading) setOpen(nextOpen); }}>
        <DialogMobileContent
          className="max-w-md"
          onEscapeKeyDown={(event) => { if (isLoading) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (isLoading) event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogMobileHeader>
            <DialogTitle>Corregir pago</DialogTitle>
            <DialogDescription>
              Reemplaza el pago capturado para {quoteNumber ? `la cotización ${quoteNumber}` : "esta nota"}.
            </DialogDescription>
            <DialogMobileClose aria-label="Cerrar corrección de pago" disabled={isLoading} />
          </DialogMobileHeader>

          <DialogMobileBody>
            {result ? (
              <div className="grid gap-4">
                <div
                  className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]"
                  role="status"
                >
                  Corrección registrada.
                </div>

                <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Monto original</span>
                    <span className="font-semibold tabular-nums text-[var(--color-text-main)]">{formatCents(originalAmountCents)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Método original</span>
                    <span className="font-medium text-[var(--color-text-main)]">{originalMethodLabel}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Monto de reemplazo</span>
                    <span className="font-semibold tabular-nums text-[var(--color-text-main)]">{formatCents(result.replacementAmountCents)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Método de reemplazo</span>
                    <span className="font-medium text-[var(--color-text-main)]">{PAYMENT_METHOD_LABELS[result.method] ?? result.method}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Motivo</span>
                    <span className="font-medium text-[var(--color-text-main)]">{result.reason}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Responsable</span>
                    <span className="font-medium text-[var(--color-text-main)]">{result.actorName ?? result.actorId}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Fecha</span>
                    <span className="font-medium text-[var(--color-text-main)]">{formatDate(result.createdAt)}</span>
                  </div>
                </div>

                {result.applications.length > 0 ? (
                  <div className="grid gap-2">
                    <h4 className="text-sm font-semibold text-[var(--color-text-main)]">Aplicaciones corregidas</h4>
                    <ul className="grid gap-2">
                      {result.applications.map((app, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-[var(--color-text-main)]">Nota {app.workOrderId.slice(-6)}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              Original {formatCents(app.originalAmountCents)} · Reemplazo {formatCents(app.replacementAmountCents)}
                            </p>
                          </div>
                          {app.shortfallCents > 0 ? (
                            <span className="text-xs font-medium text-[var(--color-status-danger-fg)]">
                              Faltante {formatCents(app.shortfallCents)}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-[var(--color-status-success-fg)]">Sin faltante</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {result.excessCreditCents > 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Sobrante como saldo a favor: <span className="font-medium text-[var(--color-text-main)]">{formatCents(result.excessCreditCents)}</span>
                  </p>
                ) : null}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cerrar
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Monto original</span>
                    <span className="font-semibold tabular-nums text-[var(--color-text-main)]">{formatCents(originalAmountCents)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[var(--color-text-muted)]">Método original</span>
                    <span className="font-medium text-[var(--color-text-main)]">{originalMethodLabel}</span>
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

                <label
                  className="grid gap-2 text-sm font-medium text-[var(--color-text-main)]"
                  htmlFor={`correction-method-${paymentId}`}
                >
                  Nuevo método
                  <select
                    id={`correction-method-${paymentId}`}
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 disabled:opacity-50"
                    required
                  >
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label
                  className="grid gap-2 text-sm font-medium text-[var(--color-text-main)]"
                  htmlFor={`correction-amount-${paymentId}`}
                >
                  Nuevo monto
                  <Input
                    id={`correction-amount-${paymentId}`}
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    inputMode="decimal"
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    aria-describedby={`correction-amount-help-${paymentId}${amountError ? ` correction-amount-error-${paymentId}` : ""}`}
                    aria-invalid={amountError ? true : undefined}
                    disabled={isLoading}
                    required
                  />
                  <span
                    id={`correction-amount-help-${paymentId}`}
                    className="text-xs font-normal text-[var(--color-text-muted)]"
                  >
                    Ingresa el monto corregido del pago.
                  </span>
                  <span
                    id={`correction-amount-error-${paymentId}`}
                    role={amountError ? "alert" : undefined}
                    className="min-h-4 text-xs font-normal text-[var(--color-status-danger-fg)]"
                  >
                    {amountError}
                  </span>
                </label>

                <div className="grid gap-2">
                  <Label htmlFor={`correction-reason-${paymentId}`}>
                    Motivo de la corrección <span className="text-[var(--color-status-danger-fg)]">*</span>
                  </Label>
                  <Textarea
                    id={`correction-reason-${paymentId}`}
                    value={reason}
                    onChange={(event) => handleReasonChange(event.target.value)}
                    placeholder="Ej. Error de captura en monto, método incorrecto..."
                    disabled={isLoading}
                    rows={3}
                    aria-invalid={reasonError ? "true" : undefined}
                    aria-describedby={reasonError ? `correction-reason-error-${paymentId}` : undefined}
                  />
                  {reasonError && (
                    <p id={`correction-reason-error-${paymentId}`} className="text-xs text-[var(--color-status-danger-fg)]" role="alert">
                      {reasonError}
                    </p>
                  )}
                </div>

                {error && (
                  <div
                    className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={Boolean(amountError) || Boolean(reasonError) || isLoading}
                  >
                    Confirmar corrección
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}
