const TIME_ZONE = "America/Mexico_City";

export type ReceivableExceptionType = "NEGOTIATED_TERM" | "PENDING_AUTHORIZATION";

export type ReceivableException =
  | {
      type: "NEGOTIATED_TERM";
      agreedDueDate: Date;
      reason?: string;
    }
  | {
      type: "PENDING_AUTHORIZATION";
      reason?: string;
    };

export function mexicoCityDateParts(date: Date) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(values.map(({ type, value }) => [type, value]));
}

export function mexicoCityCalendarDate(date: Date): string {
  const p = mexicoCityDateParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function mexicoCityEpochDay(date: Date): number {
  const p = mexicoCityDateParts(date);
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
}

/**
 * Adds a specific number of calendar days in America/Mexico_City,
 * preserving calendar day semantics across DST and leap years.
 */
export function addCalendarDaysInMexicoCity(date: Date, days: number): Date {
  const p = mexicoCityDateParts(date);
  const targetUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + days, 12, 0, 0);
  let instant = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = mexicoCityDateParts(new Date(instant));
    instant += targetUtc - Date.UTC(
      Number(observed.year),
      Number(observed.month) - 1,
      Number(observed.day),
      Number(observed.hour),
      Number(observed.minute),
      Number(observed.second),
    );
  }
  return new Date(instant);
}

/**
 * Standard rule: Due date is set to exactly 7 calendar days from completion in America/Mexico_City.
 */
export function calculateDefaultPaymentDueDate(completedAt: Date): Date {
  return addCalendarDaysInMexicoCity(completedAt, 7);
}

export interface IsNoteOverdueInput {
  paymentDueDate: Date | null | undefined;
  pendingBalanceCents: number;
  now?: Date;
  exception?: ReceivableException | null;
}

/**
 * A Note is overdue ONLY if:
 * 1. It has a real pending balance greater than zero.
 * 2. It has an active due date that is strictly prior to today in Mexico City.
 * 3. It is not exempted by an active condition (e.g. pending authorization, or unexpired negotiated term).
 */
export function isNoteOverdue({
  paymentDueDate,
  pendingBalanceCents,
  now = new Date(),
  exception,
}: IsNoteOverdueInput): boolean {
  if (pendingBalanceCents <= 0) {
    return false;
  }

  if (exception?.type === "PENDING_AUTHORIZATION") {
    return false;
  }

  const todayDay = mexicoCityEpochDay(now);

  if (exception?.type === "NEGOTIATED_TERM") {
    const negotiatedDay = mexicoCityEpochDay(exception.agreedDueDate);
    return negotiatedDay < todayDay;
  }

  if (!paymentDueDate) {
    return false;
  }

  const dueDay = mexicoCityEpochDay(new Date(paymentDueDate));
  return dueDay < todayDay;
}
