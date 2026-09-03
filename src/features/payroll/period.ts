const TIME_ZONE = "America/Mexico_City";

export type PayrollPeriodMode = "weekly" | "monthly";

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
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value ?? "");
  const fallbackParts = parts(fallback);
  const result = match
    ? { year: +match[1], month: +match[2], day: +(match[3] || "1") }
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

function addMonths(date: ReturnType<typeof calendarDate>, months: number) {
  const targetMonthIndex = date.month - 1 + months;
  const newYear = date.year + Math.floor(targetMonthIndex / 12);
  const newMonth = (((targetMonthIndex % 12) + 12) % 12) + 1;
  return { year: newYear, month: newMonth, day: 1 };
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

export function formatMonthPayrollRangeLabel(date: ReturnType<typeof calendarDate>): string {
  const formatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatted = formatter.format(utcDate({ year: date.year, month: date.month, day: 1 }));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export interface ParsedPayrollParams {
  mode: PayrollPeriodMode;
  anchor: string;
  prevAnchor: string;
  nextAnchor: string;
  rangeLabel: string;
  isCurrentWeek: boolean;
  isCurrentPeriod: boolean;
  start: Date;
  end: Date;
}

export function parsePayrollParams(
  input: Record<string, string | string[] | undefined>,
  now = new Date()
): ParsedPayrollParams {
  const rawMode = typeof input.mode === "string" ? input.mode : undefined;
  const mode: PayrollPeriodMode = rawMode === "monthly" ? "monthly" : "weekly";

  const rawAnchor =
    typeof input.anchor === "string"
      ? input.anchor
      : typeof input.month === "string"
        ? input.month
        : undefined;

  if (mode === "monthly") {
    let parsedDate = calendarDate(rawAnchor, now);
    parsedDate = { year: parsedDate.year, month: parsedDate.month, day: 1 };

    const currentDate = calendarDate(undefined, now);
    const isCurrentMonth =
      parsedDate.year === currentDate.year && parsedDate.month === currentDate.month;

    const startDate = parsedDate;
    const endDate = addMonths(startDate, 1);
    const prevMonthDate = addMonths(startDate, -1);
    const nextMonthDate = addMonths(startDate, 1);

    const prevAnchor = `${prevMonthDate.year}-${String(prevMonthDate.month).padStart(2, "0")}-01`;
    const nextAnchor = `${nextMonthDate.year}-${String(nextMonthDate.month).padStart(2, "0")}-01`;
    const anchor = `${startDate.year}-${String(startDate.month).padStart(2, "0")}-01`;

    return {
      mode: "monthly",
      anchor,
      prevAnchor,
      nextAnchor,
      rangeLabel: formatMonthPayrollRangeLabel(startDate),
      isCurrentWeek: isCurrentMonth,
      isCurrentPeriod: isCurrentMonth,
      start: localMidnightUtc(startDate),
      end: localMidnightUtc(endDate),
    };
  }

  // Weekly mode (default)
  const anchorDate = calendarDate(rawAnchor, now);
  const weekday = new Date(Date.UTC(anchorDate.year, anchorDate.month - 1, anchorDate.day)).getUTCDay();
  // Monday as first day of week: (weekday + 6) % 7 gives 0 for Monday, 6 for Sunday
  const mondayOffset = (weekday + 6) % 7;
  const startDate = addDays(anchorDate, -mondayOffset);
  const endDate = addDays(startDate, 6); // Sunday 00:00 exclusive (Monday to Saturday active)

  const currentDate = calendarDate(undefined, now);
  const currentWeekday = new Date(Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day)).getUTCDay();
  const currentWeekMonday = addDays(currentDate, -((currentWeekday + 6) % 7));

  const isCurrentWeek = value(startDate) === value(currentWeekMonday);
  const prevAnchor = value(addDays(startDate, -7));
  const nextAnchor = value(addDays(startDate, 7));

  return {
    mode: "weekly",
    anchor: value(startDate),
    prevAnchor,
    nextAnchor,
    rangeLabel: formatPayrollRangeLabel(startDate, endDate),
    isCurrentWeek,
    isCurrentPeriod: isCurrentWeek,
    start: localMidnightUtc(startDate),
    end: localMidnightUtc(endDate),
  };
}

export function payrollHref(
  anchorOrOptions?: string | { mode?: PayrollPeriodMode; anchor?: string }
): string {
  if (!anchorOrOptions) return "/admin/nomina";
  if (typeof anchorOrOptions === "string") {
    const params = new URLSearchParams({ anchor: anchorOrOptions });
    return `/admin/nomina?${params.toString()}`;
  }
  const params = new URLSearchParams();
  if (anchorOrOptions.mode && anchorOrOptions.mode !== "weekly") {
    params.set("mode", anchorOrOptions.mode);
  }
  if (anchorOrOptions.anchor) {
    params.set("anchor", anchorOrOptions.anchor);
  }
  const qs = params.toString();
  return qs ? `/admin/nomina?${qs}` : "/admin/nomina";
}
