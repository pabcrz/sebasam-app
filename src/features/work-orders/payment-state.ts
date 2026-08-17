import type { BadgeVariant } from "@/components/ui";

const TIME_ZONE = "America/Mexico_City";

type PaymentStateInput = {
  completedAt: Date | null;
  paidCents: number;
  remainingCents: number;
};

export type PaymentState = {
  label: "Pagada" | "Pago parcial" | "Sin pago" | "Cobro urgente";
  balanceCents: number | null;
  variant: BadgeVariant;
};

function calendarDay(date: Date) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const parts = Object.fromEntries(values.map(({ type, value }) => [type, value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

export function derivePaymentState({ completedAt, paidCents, remainingCents }: PaymentStateInput, now = new Date()): PaymentState {
  if (remainingCents <= 0) return { label: "Pagada", balanceCents: null, variant: "success" };

  const daysSinceCompletion = completedAt ? (calendarDay(now) - calendarDay(completedAt)) / 86_400_000 : 0;
  if (daysSinceCompletion > 15) return { label: "Cobro urgente", balanceCents: remainingCents, variant: "danger" };
  if (paidCents > 0) return { label: "Pago parcial", balanceCents: remainingCents, variant: "warning" };
  return { label: "Sin pago", balanceCents: remainingCents, variant: "warning" };
}
