const TIME_ZONE = "America/Mexico_City";

function parts(date: Date) {
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

function calendarDate(value: string | undefined, fallback = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  const fallbackParts = parts(fallback);
  const result = match
    ? { year: +match[1], month: +match[2], day: +match[3] }
    : {
        year: +fallbackParts.year,
        month: +fallbackParts.month,
        day: +fallbackParts.day,
      };
  const check = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (
    check.getUTCFullYear() !== result.year ||
    check.getUTCMonth() !== result.month - 1 ||
    check.getUTCDate() !== result.day
  ) {
    return calendarDate(undefined, fallback);
  }
  return result;
}

function addDays(date: ReturnType<typeof calendarDate>, days: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function localMidnightUtc(date: ReturnType<typeof calendarDate>) {
  const target = Date.UTC(date.year, date.month - 1, date.day);
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = parts(new Date(instant));
    instant +=
      target -
      Date.UTC(
        +observed.year,
        +observed.month - 1,
        +observed.day,
        +observed.hour,
        +observed.minute,
        +observed.second
      );
  }
  return new Date(instant);
}

function value(date: ReturnType<typeof calendarDate>) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function utcDate(date: ReturnType<typeof calendarDate>) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function formatPayrollRangeLabel(
  start: ReturnType<typeof calendarDate>,
  endExclusive: ReturnType<typeof calendarDate>
): string {
  const lastActiveDay = addDays(endExclusive, -1);
  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return formatter.formatRange(utcDate(start), utcDate(lastActiveDay));
}

export interface ParsedPayrollParams {
  anchor: string;
  prevAnchor: string;
  nextAnchor: string;
  rangeLabel: string;
  isCurrentWeek: boolean;
  start: Date;
  end: Date;
}

export function parsePayrollParams(
  input: Record<string, string | string[] | undefined>,
  now = new Date()
): ParsedPayrollParams {
  const anchor = calendarDate(typeof input.anchor === "string" ? input.anchor : undefined, now);
  const weekday = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day)).getUTCDay();
  // Monday as first day of week: (weekday + 6) % 7 gives 0 for Monday, 6 for Sunday
  const mondayOffset = (weekday + 6) % 7;
  const startDate = addDays(anchor, -mondayOffset);
  const endDate = addDays(startDate, 6); // Sunday, exclusive

  const currentDate = calendarDate(undefined, now);
  const currentWeekday = new Date(Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day)).getUTCDay();
  const currentWeekMonday = addDays(currentDate, -((currentWeekday + 6) % 7));

  const isCurrentWeek = value(startDate) === value(currentWeekMonday);
  const prevAnchor = value(addDays(startDate, -7));
  const nextAnchor = value(addDays(startDate, 7));

  return {
    anchor: value(startDate),
    prevAnchor,
    nextAnchor,
    rangeLabel: formatPayrollRangeLabel(startDate, endDate),
    isCurrentWeek,
    start: localMidnightUtc(startDate),
    end: localMidnightUtc(endDate),
  };
}

export function payrollHref(anchor?: string): string {
  if (!anchor) return "/admin/nomina";
  const params = new URLSearchParams({ anchor });
  return `/admin/nomina?${params.toString()}`;
}
