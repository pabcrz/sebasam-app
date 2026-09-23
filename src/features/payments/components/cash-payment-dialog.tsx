"use client";

import * as React from "react";
import { CreditCard, Download } from "lucide-react";
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
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { useRouter } from "next/navigation";

import { clsx } from "clsx";
import type { ButtonVariant } from "@/components/ui";
import {
  buildPaymentReceiptMessage,
  createPaymentReceiptFile,
  type PaymentReceiptData,
} from "@/features/payments/lib/payment-receipt";
import { downloadPaymentFile, paymentShareStatusMessage, sharePaymentFile } from "@/features/payments/lib/payment-sharing";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  OTHER: "Otro",
};

const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS);

type PaymentResult = {
  payment: { amountCents: number; createdAt?: Date };
  paidCents: number;
  remainingCents: number;
};

export function PaymentBalanceSummary({
  totalCents,
  paidCents,
  remainingCents,
  className,
}: {
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  className?: string;
}) {
  return (
    <div className={clsx("grid gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm", className)}>
      <div className="flex items-center justify-between gap-3 text-[var(--color-text-muted)]">
        <span>Total</span>
        <span>{formatCents(totalCents)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[var(--color-text-muted)]">
        <span>Pagado</span>
        <span>{formatCents(paidCents)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-light)] pt-2 font-semibold text-[var(--color-text-main)]">
        <span>Saldo pendiente</span>
        <span>{formatCents(remainingCents)}</span>
      </div>
    </div>
  );
}

export interface CashPaymentDialogProps {
  action: (amount: string, operationKey: string, method: string) => Promise<PaymentResult>;
  quoteNumber: string;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  triggerOnly?: boolean;
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
  triggerIconOnlyMobile?: boolean;
  documentTitle?: string;
  documentFolio?: string;
  customerName?: string;
  receiptEnabled?: boolean;
  allowedMethods?: string[];
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function validateAmount(value: string, remainingCents: number) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    return "Ingresa un monto válido con hasta dos decimales.";
  }

  const [whole, fractional = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents <= 0) return "El pago debe ser mayor que cero.";
  if (cents > remainingCents) return "El pago no puede exceder el saldo pendiente.";
  return null;
}

export function CashPaymentDialog({
  action,
  quoteNumber,
  totalCents,
  paidCents,
  remainingCents,
  triggerOnly = false,
  triggerVariant = "outline",
  triggerClassName,
  triggerIconOnlyMobile = false,
  documentTitle = "Nota",
  documentFolio = quoteNumber,
  customerName = "Cliente",
  receiptEnabled = false,
  allowedMethods = PAYMENT_METHODS.map(([value]) => value),
}: CashPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [summary, setSummary] = React.useState({ paidCents, remainingCents });
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [operationKey, setOperationKey] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<PaymentReceiptData | null>(null);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateAmount(amount, summary.remainingCents);
    if (validationError) {
      setAmountError(validationError);
      return;
    }
    setAmountError(null);

    if (!operationKey) {
      setError("No se pudo iniciar la operación de pago. Cierra y vuelve a abrir el formulario.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await action(amount, operationKey, method);
      setSuccess(
        `Pago por ${PAYMENT_METHOD_LABELS[method] ?? method} registrado por ${formatCents(result.payment.amountCents)}.`,
      );
      setSummary({ paidCents: result.paidCents, remainingCents: result.remainingCents });
      setReceipt(receiptEnabled ? {
        title: documentTitle,
        folio: documentFolio,
        customerName,
        totalCents,
        paymentCents: result.payment.amountCents,
        paidCents: result.paidCents,
        remainingCents: result.remainingCents,
        method,
        paymentDate: result.payment.createdAt ?? new Date(),
      } : null);
      setReceiptError(null);
      setReceiptStatus(null);
      setAmount(centsToInput(result.remainingCents));
      setOperationKey(crypto.randomUUID());
      setTimeout(() => {
        router.refresh();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setAmount("");
    setError(null);
    setAmountError(null);
    setSuccess(null);
    setReceipt(null);
    setReceiptError(null);
    setReceiptStatus(null);
    setOperationKey(crypto.randomUUID());
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setAmountError(validateAmount(value, summary.remainingCents));
    setError(null);
  }

  if (summary.remainingCents <= 0) {
    if (triggerOnly) return null;
    return (
      <section className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
        <PaymentBalanceSummary
          totalCents={totalCents}
          paidCents={summary.paidCents}
          remainingCents={summary.remainingCents}
          className="border-0 p-0"
        />
      </section>
    );
  }

  const triggerButton = (
    <Button
      type="button"
      variant={triggerVariant}
      size="sm"
      ref={triggerRef}
      onClick={handleOpen}
      aria-label={`Registrar pago para ${quoteNumber}`}
      title={`Registrar pago para ${quoteNumber}`}
      className={triggerClassName ?? (triggerIconOnlyMobile ? "h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3" : "w-full")}
    >
      <CreditCard className="h-5 w-5" aria-hidden="true" />
      <span className={triggerIconOnlyMobile ? "sr-only sm:not-sr-only" : undefined}>Registrar pago</span>
    </Button>
  );

  const dialogElement = (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isLoading) setOpen(nextOpen); }}>
      <DialogMobileContent
        className="max-w-sm"
        onEscapeKeyDown={(event) => { if (isLoading) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (isLoading) event.preventDefault(); }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <DialogMobileHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Registra un pago para la cotización {quoteNumber}.
          </DialogDescription>
          <DialogMobileClose aria-label="Cerrar registro de pago" disabled={isLoading} />
        </DialogMobileHeader>
        <DialogMobileBody>
          <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span>Total</span>
                  <span>{formatCents(totalCents)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Pagado acumulado</span>
                  <span>{formatCents(summary.paidCents)}</span>
                </div>
                <div className="flex justify-between gap-3 font-semibold">
                <span>Saldo pendiente</span>
                <span>{formatCents(summary.remainingCents)}</span>
              </div>
            </div>

            <label
              className="grid gap-2 text-sm font-medium text-[var(--color-text-main)]"
              htmlFor={`payment-method-${quoteNumber}`}
            >
              Tipo de pago
              <select
                id={`payment-method-${quoteNumber}`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={isLoading}
                className="flex h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-input)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 disabled:opacity-50"
                required
              >
                {PAYMENT_METHODS.filter(([value]) => allowedMethods.includes(value)).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="grid gap-2 text-sm font-medium text-[var(--color-text-main)]"
              htmlFor={`cash-amount-${quoteNumber}`}
            >
              Monto recibido
              <Input
                id={`cash-amount-${quoteNumber}`}
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                inputMode="decimal"
                pattern="[0-9]+([.][0-9]{1,2})?"
                aria-describedby={`cash-amount-help-${quoteNumber}${amountError ? ` cash-amount-error-${quoteNumber}` : ""}`}
                aria-invalid={amountError ? true : undefined}
                disabled={isLoading}
                required
              />
              <span
                id={`cash-amount-help-${quoteNumber}`}
                className="text-xs font-normal text-[var(--color-text-muted)]"
              >
                Ingresa un pago parcial o usa el saldo pendiente para liquidar.
              </span>
              <span
                id={`cash-amount-error-${quoteNumber}`}
                role={amountError ? "alert" : undefined}
                className="min-h-4 text-xs font-normal text-[var(--color-status-danger-fg)]"
              >
                {amountError}
              </span>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleAmountChange(centsToInput(summary.remainingCents))}
              disabled={isLoading}
            >
              Pagar saldo completo
            </Button>

            {error ? (
              <p
                role="alert"
                className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-fg)]"
              >
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                role="status"
                className="rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-3 py-2 text-sm text-[var(--color-status-success-fg)]"
              >
                {success}
              </p>
            ) : null}

            {receipt ? (
              <section className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] p-3">
                <p className="text-sm font-semibold text-[var(--color-status-success-fg)]">Recibo listo para compartir</p>
                <p className="text-xs text-[var(--color-status-success-fg)]">Es un recibo emitido por el sistema, distinto del comprobante bancario.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setReceiptError(null);
                      setReceiptStatus(null);
                      try {
                        const file = createPaymentReceiptFile(receipt);
                        const message = buildPaymentReceiptMessage(receipt);
                        const result = await sharePaymentFile(file, `Recibo ${receipt.folio}`, message);
                        setReceiptStatus(paymentShareStatusMessage(result));
                      } catch {
                        setReceiptError("No se pudo descargar el recibo. Intenta compartirlo de nuevo o hazlo manualmente.");
                      }
                    }}
                  >
                    Compartir recibo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPaymentFile(createPaymentReceiptFile(receipt))}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Descargar PNG
                  </Button>
                </div>
                {receiptError ? <p role="alert" className="text-xs text-[var(--color-status-danger-fg)]">{receiptError}</p> : null}
                {receiptStatus ? <p role="status" className="text-xs text-[var(--color-status-success-fg)]">{receiptStatus}</p> : null}
              </section>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isLoading} disabled={Boolean(amountError)}>
                Registrar pago
              </Button>
            </DialogFooter>
          </form>
        </DialogMobileBody>
      </DialogMobileContent>
    </Dialog>
  );

  if (triggerOnly) {
    return (
      <>
        {triggerButton}
        {dialogElement}
      </>
    );
  }

  return (
    <section className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
      <PaymentBalanceSummary
        totalCents={totalCents}
        paidCents={summary.paidCents}
        remainingCents={summary.remainingCents}
        className="border-0 p-0"
      />
      {triggerButton}
      {dialogElement}
    </section>
  );
}
