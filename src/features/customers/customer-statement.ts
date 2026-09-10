const TIME_ZONE = "America/Mexico_City";

export type StatementView = "pending" | "history";
export type StatementPeriodUnit = "week" | "month" | "year" | "all";

export type StatementCalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type StatementPeriodParams = {
  view: StatementView;
  period: StatementPeriodUnit;
  anchor: string;
  rangeLabel: string;
  start: Date | null;
  end: Date | null;
};

function parts(date: Date): Record<string, string> {
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

export function parseCalendarDate(value: string | undefined, fallback = new Date()): StatementCalendarDate {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value ?? "");
  const fallbackParts = parts(fallback);
  const result: StatementCalendarDate = match
    ? { year: +match[1], month: +match[2], day: match[3] ? +match[3] : 1 }
    : { year: +fallbackParts.year, month: +fallbackParts.month, day: +fallbackParts.day };

  const check = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (
    check.getUTCFullYear() !== result.year ||
    check.getUTCMonth() !== result.month - 1 ||
    check.getUTCDate() !== result.day
  ) {
    return parseCalendarDate(undefined, fallback);
  }
  return result;
}

export function addDays(date: StatementCalendarDate, days: number): StatementCalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function localMidnightUtc(date: StatementCalendarDate): Date {
  const target = Date.UTC(date.year, date.month - 1, date.day);
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = parts(new Date(instant));
    instant += target - Date.UTC(+observed.year, +observed.month - 1, +observed.day, +observed.hour, +observed.minute, +observed.second);
  }
  return new Date(instant);
}

function formatDateString(date: StatementCalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function utcDate(date: StatementCalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function getPeriodRange(
  period: StatementPeriodUnit,
  anchorDate: StatementCalendarDate,
): { start: StatementCalendarDate; end: StatementCalendarDate; label: string } {
  if (period === "all") {
    return {
      start: { year: 2000, month: 1, day: 1 },
      end: { year: 2100, month: 1, day: 1 },
      label: "Historial completo",
    };
  }

  if (period === "year") {
    const start: StatementCalendarDate = { year: anchorDate.year, month: 1, day: 1 };
    const end: StatementCalendarDate = { year: anchorDate.year + 1, month: 1, day: 1 };
    const label = `Año ${anchorDate.year}`;
    return { start, end, label };
  }

  if (period === "month") {
    const start: StatementCalendarDate = { year: anchorDate.year, month: anchorDate.month, day: 1 };
    const end: StatementCalendarDate = {
      year: anchorDate.month === 12 ? anchorDate.year + 1 : anchorDate.year,
      month: anchorDate.month === 12 ? 1 : anchorDate.month + 1,
      day: 1,
    };
    const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      utcDate(start),
    );
    return { start, end, label };
  }

  // period === "week": Monday to Sunday range [Monday 00:00, Next Monday 00:00)
  const weekday = new Date(Date.UTC(anchorDate.year, anchorDate.month - 1, anchorDate.day)).getUTCDay();
  const daysFromMonday = (weekday + 6) % 7; // Monday = 0, Sunday = 6
  const start = addDays(anchorDate, -daysFromMonday);
  const end = addDays(start, 7);
  const endInclusive = addDays(start, 6);
  const label = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(utcDate(start), utcDate(endInclusive));

  return { start, end, label };
}

export function parseCustomerStatementParams(
  input: Record<string, string | string[] | undefined>,
  now = new Date(),
): StatementPeriodParams {
  const view: StatementView = input.view === "history" ? "history" : "pending";
  const period: StatementPeriodUnit =
    input.period === "week" || input.period === "month" || input.period === "year" || input.period === "all"
      ? input.period
      : "month";

  const rawAnchor = typeof input.anchor === "string" ? input.anchor : undefined;
  const anchorDate = parseCalendarDate(rawAnchor, now);

  if (view === "pending") {
    return {
      view: "pending",
      period,
      anchor: formatDateString(anchorDate),
      rangeLabel: "Cartera pendiente",
      start: null,
      end: null,
    };
  }

  if (period === "all") {
    return {
      view: "history",
      period: "all",
      anchor: formatDateString(anchorDate),
      rangeLabel: "Historial completo",
      start: null,
      end: null,
    };
  }

  const { start: calStart, end: calEnd, label } = getPeriodRange(period, anchorDate);

  return {
    view: "history",
    period,
    anchor: formatDateString(anchorDate),
    rangeLabel: label,
    start: localMidnightUtc(calStart),
    end: localMidnightUtc(calEnd),
  };
}

export function shiftStatementAnchor(
  period: StatementPeriodUnit,
  currentAnchor: string,
  delta: number,
): string {
  const cal = parseCalendarDate(currentAnchor);
  if (period === "week") {
    const next = addDays(cal, delta * 7);
    return formatDateString(next);
  }
  if (period === "month") {
    const nextDate = new Date(Date.UTC(cal.year, cal.month - 1 + delta, 1));
    return `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  if (period === "year") {
    return `${cal.year + delta}-01-01`;
  }
  return currentAnchor;
}

export function customerStatementHref(
  customerId: string,
  state: {
    view?: StatementView;
    period?: StatementPeriodUnit;
    anchor?: string;
  },
): string {
  const params = new URLSearchParams();
  if (state.view && state.view !== "pending") {
    params.set("view", state.view);
  }
  if (state.period && state.period !== "month") {
    params.set("period", state.period);
  }
  if (state.anchor) {
    params.set("anchor", state.anchor);
  }

  const queryString = params.toString();
  return `/admin/customers/${customerId}/estado-de-cuenta${queryString ? `?${queryString}` : ""}`;
}
