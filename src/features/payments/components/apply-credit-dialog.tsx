"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { applyCustomerCreditAction } from "../actions";

export interface ApplyCreditDialogProps {
  customerId: string;
  workOrderId: string;
  noteNumber: string;
  remainingCents: number;
  availableCreditCents: number;
  action?: (customerId: string, workOrderId: string, amount: string, operationKey: string) => Promise<unknown>;
  onSuccess?: () => void;
  triggerLabel?: string;
  triggerSize?: "sm" | "default" | "lg";
  triggerVariant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function validateCreditAmount(value: string, remainingCents: number, availableCreditCents: number): string | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    return "Ingresa un monto válido con hasta dos decimales.";
  }

  const [whole, fractional = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return "El monto a aplicar debe ser mayor que cero.";
  }

  if (cents > remainingCents) {
    return "El monto no puede exceder el saldo pendiente de la nota.";
  }

  if (cents > availableCreditCents) {
    return "El monto no puede exceder el saldo a favor disponible.";
  }

  return null;
}

export function ApplyCreditDialog({
  customerId,
  workOrderId,
  noteNumber,
  remainingCents,
  availableCreditCents,
  action = applyCustomerCreditAction,
  onSuccess,
  triggerLabel = "Aplicar saldo",
  triggerSize = "sm",
  triggerVariant = "outline",
}: ApplyCreditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const maxApplicableCents = Math.min(remainingCents, availableCreditCents);
  const [amount, setAmount] = React.useState(centsToInput(maxApplicableCents));
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [operationKey, setOperationKey] = React.useState<string | null>(null);

  function handleOpen() {
    setOpen(true);
    setAmount(centsToInput(Math.min(remainingCents, availableCreditCents)));
    setAmountError(null);
    setError(null);
    setOperationKey(crypto.randomUUID());
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setAmountError(validateCreditAmount(value, remainingCents, availableCreditCents));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateCreditAmount(amount, remainingCents, availableCreditCents);
    if (validationError) {
      setAmountError(validationError);
      return;
    }
    setAmountError(null);

    if (!operationKey) {
      setError("No se pudo iniciar la operación de crédito. Vuelve a abrir el formulario.");
      return;
    }

    setIsLoading(true);

    try {
      await action(customerId, workOrderId, amount, operationKey);
      // Rotate operationKey only on success
      setOperationKey(crypto.randomUUID());
      toast.success(`Saldo aplicado a la nota ${noteNumber}.`);
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar el saldo a favor.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        aria-label={`Aplicar saldo a favor a nota ${noteNumber}`}
        className="flex items-center gap-1.5"
      >
        <Icon name="coins" className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{triggerLabel}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogMobileContent
          className="max-w-md"
          onPointerDownOutside={(e) => {
            if (isLoading) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isLoading) e.preventDefault();
          }}
        >
          <DialogMobileHeader>
            <DialogTitle>Aplicar saldo a favor</DialogTitle>
            <DialogDescription>
              Aplica crédito disponible del cliente para saldar la nota{" "}
              <span className="font-semibold text-[var(--color-text-main)]">{noteNumber}</span>.
            </DialogDescription>
          </DialogMobileHeader>

          <DialogMobileBody>
            <form id="apply-credit-form" onSubmit={handleSubmit} className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-xs">
                <div>
                  <span className="text-[var(--color-text-muted)]">Saldo pendiente:</span>
                  <p className="mt-0.5 font-semibold tabular-nums text-[var(--color-text-main)]">
                    {formatCents(remainingCents)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Crédito disponible:</span>
                  <p className="mt-0.5 font-semibold tabular-nums text-[var(--color-status-success-fg)]">
                    {formatCents(availableCreditCents)}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="credit-amount-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1"
                >
                  Monto a aplicar ($)
                </label>
                <Input
                  id="credit-amount-input"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  disabled={isLoading}
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="font-mono text-base tabular-nums"
                  aria-invalid={Boolean(amountError)}
                  aria-describedby={amountError ? "credit-amount-error" : undefined}
                />
                {amountError ? (
                  <p id="credit-amount-error" className="mt-1 text-xs text-[var(--color-status-danger-fg)]" role="alert">
                    {amountError}
                  </p>
                ) : null}
              </div>

              {error ? (
                <div
                  className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] p-3 text-xs text-[var(--color-status-danger-fg)]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <DialogFooter className="mt-2 flex justify-end gap-2">
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
                  variant="primary"
                  disabled={isLoading || Boolean(amountError) || !amount}
                >
                  {isLoading ? "Aplicando..." : "Confirmar aplicación"}
                </Button>
              </DialogFooter>
            </form>
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}
