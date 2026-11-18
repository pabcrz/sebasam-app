import { mexicoCityCalendarDate } from "./operational-date";

export type ValidityHint = { label: string; tone: "muted" | "warning" | "danger" };

const dayMs = 86_400_000;
const toUtcDay = (calendarDate: string) => Date.parse(`${calendarDate}T00:00:00Z`);

/** Calendar days left until the quote expires, in Mexico City days. Amber at 3 or fewer. */
export function quoteValidityHint(validUntil: Date, now = new Date()): ValidityHint {
  const days = Math.round((toUtcDay(mexicoCityCalendarDate(validUntil)) - toUtcDay(mexicoCityCalendarDate(now))) / dayMs);
  if (days < 0) return { label: "Vencida", tone: "danger" };
  if (days === 0) return { label: "Vence hoy", tone: "warning" };
  return { label: `${days} ${days === 1 ? "día" : "días"}`, tone: days <= 3 ? "warning" : "muted" };
}
