"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { useRouter } from "next/navigation";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  OTHER: "Otro",
};

const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS);

type PaymentResult = {
  payment: { amountCents: number };
  paidCents: number;
  remainingCents: number;
};

export interface CashPaymentDialogProps {
  action: (amount: string, operationKey: string, method: string) => Promise<PaymentResult>;
  quoteNumber: string;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function CashPaymentDialog({
  action,
  quoteNumber,
  totalCents,
  paidCents,
  remainingCents,
}: CashPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(centsToInput(remainingCents));
  const [method, setMethod] = React.useState("CASH");
  const [summary, setSummary] = React.useState({ paidCents, remainingCents });
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [operationKey, setOperationKey] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!operationKey) {
      setError("No se pudo iniciar la operación de pago. Cierra y vuelve a abrir el formulario.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await action(amount, operationKey, method);
      setSummary({ paidCents: result.paidCents, remainingCents: result.remainingCents });
      setAmount(centsToInput(result.remainingCents));
      setOperationKey(crypto.randomUUID());
      setSuccess(
        `Pago por ${PAYMENT_METHOD_LABELS[method] ?? method} registrado por ${formatCents(result.payment.amountCents)}.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setAmount(centsToInput(summary.remainingCents));
    setError(null);
    setSuccess(null);
    setOperationKey(crypto.randomUUID());
  }

  return (
    <section className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
      <div className="grid gap-1 text-sm">
        <div className="flex items-center justify-between gap-3 text-[var(--color-text-muted)]">
          <span>Total</span>
          <span>{formatCents(totalCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[var(--color-text-muted)]">
          <span>Pagado</span>
          <span>{formatCents(summary.paidCents)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border-light)] pt-2 font-semibold text-[var(--color-text-main)]">
          <span>Saldo pendiente</span>
          <span>{formatCents(summary.remainingCents)}</span>
        </div>
      </div>

      {summary.remainingCents > 0 ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpen}
            aria-label={`Registrar pago para ${quoteNumber}`}
            title={`Registrar pago para ${quoteNumber}`}
            className="h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3"
          >
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Registrar pago</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar pago</DialogTitle>
                <DialogDescription>
                  Registra un pago para la cotización {quoteNumber}.
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>Total</span>
                    <span>{formatCents(totalCents)}</span>
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
                    {PAYMENT_METHODS.map(([value, label]) => (
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
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    aria-describedby={`cash-amount-help-${quoteNumber}`}
                    disabled={isLoading}
                    required
                  />
                  <span
                    id={`cash-amount-help-${quoteNumber}`}
                    className="text-xs font-normal text-[var(--color-text-muted)]"
                  >
                    Ingresa un pago parcial o usa el saldo pendiente para liquidar.
                  </span>
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAmount(centsToInput(summary.remainingCents))}
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

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={isLoading}>
                    Registrar pago
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </section>
  );
}
