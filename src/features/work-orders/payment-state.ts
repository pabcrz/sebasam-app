import type { BadgeVariant } from "@/components/ui";
import {
  isNoteOverdue,
  type ReceivableException,
} from "./receivables-policy";

type PaymentStateInput = {
  completedAt?: Date | null;
  paymentDueDate?: Date | null;
  paidCents: number;
  remainingCents: number;
  exception?: ReceivableException | null;
};

export type PaymentStateLabel =
  | "Pagada"
  | "Pago parcial"
  | "Sin pago"
  | "Vencida"
  | "Sin fecha de vencimiento"
  | "Plazo pactado"
  | "Pend. autorización";

export type PaymentState = {
  label: PaymentStateLabel;
  balanceCents: number | null;
  variant: BadgeVariant;
};

export function derivePaymentState(
  { paymentDueDate, paidCents, remainingCents, exception }: PaymentStateInput,
  now = new Date(),
): PaymentState {
  if (remainingCents <= 0) {
    return { label: "Pagada", balanceCents: null, variant: "success" };
  }

  if (exception?.type === "PENDING_AUTHORIZATION") {
    return { label: "Pend. autorización", balanceCents: remainingCents, variant: "info" };
  }

  const overdue = isNoteOverdue({
    paymentDueDate,
    pendingBalanceCents: remainingCents,
    now,
    exception,
  });

  if (overdue) {
    return { label: "Vencida", balanceCents: remainingCents, variant: "danger" };
  }

  if (exception?.type === "NEGOTIATED_TERM") {
    return { label: "Plazo pactado", balanceCents: remainingCents, variant: "info" };
  }

  if (!paymentDueDate) {
    return { label: "Sin fecha de vencimiento", balanceCents: remainingCents, variant: "default" };
  }

  if (paidCents > 0) {
    return { label: "Pago parcial", balanceCents: remainingCents, variant: "warning" };
  }

  return { label: "Sin pago", balanceCents: remainingCents, variant: "warning" };
}

