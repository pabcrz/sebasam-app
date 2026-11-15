/**
 * Pure period logic for PeriodNavigator and any screen that filters by period.
 *
 * Anchors are calendar dates as "YYYY-MM-DD" (any day inside the period).
 * "Today" is always an injected `Date`, read as a Mexico City calendar day.
 *
 * Label format (Spanish, lowercase month names, en dash with spaces only across months):
 * - week, same month:   "9–14 de noviembre de 2026"
 * - week, across months: "30 de octubre – 4 de noviembre de 2023"
 * - week, across years:  "28 de diciembre de 2026 – 2 de enero de 2027"
 * - month: "noviembre de 2026"
 * - year:  "2026"
 * - all:   "Historial completo"
 *
 * Weeks run Monday to Saturday by default (Notas). Pass `weekDays: 7` for Monday to Sunday.
 */

export const PERIOD_TIME_ZONE = "America/Mexico_City";

export type PeriodView = "week" | "month" | "year" | "all";

export type PeriodOptions = {
  weekDays?: 6 | 7;
};

type CalendarDate = { year: number; month: number; day: number };

const SPANISH_MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateKey(anchor: string): CalendarDate {
  const match = DATE_KEY.exec(anchor);
  const date = match ? { year: +match[1], month: +match[2], day: +match[3] } : undefined;
  if (!date || !isRealDate(date)) {
    throw new RangeError(`Invalid period anchor: ${anchor}`);
  }
  return date;
}

function isRealDate({ year, month, day }: CalendarDate): boolean {
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

function toDateKey({ year, month, day }: CalendarDate): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function weekdayMondayFirst(date: CalendarDate): number {
  return (new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() + 6) % 7;
}

/** The Mexico City calendar day of an instant, as "YYYY-MM-DD". */
export function mexicoCityDateKey(now: Date): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: PERIOD_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

/** First day of the period that contains `anchor`. Week length only affects the label, not the start. */
function periodStartDate(view: PeriodView, anchor: CalendarDate): CalendarDate {
  if (view === "week") return addDays(anchor, -weekdayMondayFirst(anchor));
  if (view === "month") return { year: anchor.year, month: anchor.month, day: 1 };
  if (view === "year") return { year: anchor.year, month: 1, day: 1 };
  return anchor;
}

/** The key of the first day of the period that contains `anchor`. */
export function periodStart(view: PeriodView, anchor: string): string {
  return toDateKey(periodStartDate(view, parseDateKey(anchor)));
}

/** Moves the anchor by whole periods and returns the canonical first day of the new period. */
export function shiftPeriodAnchor(view: PeriodView, anchor: string, delta: number): string {
  const start = periodStartDate(view, parseDateKey(anchor));
  if (view === "week") return toDateKey(addDays(start, delta * 7));
  if (view === "month") {
    const shifted = new Date(Date.UTC(start.year, start.month - 1 + delta, 1));
    return toDateKey({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: 1 });
  }
  if (view === "year") return toDateKey({ year: start.year + delta, month: 1, day: 1 });
  return toDateKey(start);
}

/** True when `anchor` falls in the period that contains `today` (Mexico City day). */
export function isCurrentPeriod(view: PeriodView, anchor: string, today: Date): boolean {
  if (view === "all") return true;
  return periodStart(view, anchor) === periodStart(view, mexicoCityDateKey(today));
}

function monthName(month: number): string {
  return SPANISH_MONTHS[month - 1];
}

export function formatPeriodLabel(view: PeriodView, anchor: string, options: PeriodOptions = {}): string {
  if (view === "all") return "Historial completo";

  const start = periodStartDate(view, parseDateKey(anchor));
  if (view === "year") return String(start.year);
  if (view === "month") return `${monthName(start.month)} de ${start.year}`;

  const end = addDays(start, (options.weekDays ?? 6) - 1);
  const sameMonth = start.month === end.month;
  if (sameMonth) {
    return `${start.day}–${end.day} de ${monthName(end.month)} de ${end.year}`;
  }
  if (start.year === end.year) {
    return `${start.day} de ${monthName(start.month)} – ${end.day} de ${monthName(end.month)} de ${end.year}`;
  }
  return `${start.day} de ${monthName(start.month)} de ${start.year} – ${end.day} de ${monthName(end.month)} de ${end.year}`;
}
