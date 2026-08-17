const TIME_ZONE = "America/Mexico_City";

export type NotasMode = "week" | "month";
export type NotasPayment = "all" | "pending" | "paid";
export type NotasAssignee = "all" | "workshop" | string;

function normalizeAssignee(value: string | string[] | undefined): NotasAssignee {
  if (value === "all" || value === "workshop") return value;
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return value.toLowerCase();
  }
  return "all";
}

function parts(date: Date) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(values.map(({ type, value }) => [type, value]));
}

function calendarDate(value: string | undefined, fallback = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  const fallbackParts = parts(fallback);
  const result = match ? { year: +match[1], month: +match[2], day: +match[3] } : {
    year: +fallbackParts.year, month: +fallbackParts.month, day: +fallbackParts.day,
  };
  const check = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (check.getUTCFullYear() !== result.year || check.getUTCMonth() !== result.month - 1 || check.getUTCDate() !== result.day) {
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
    instant += target - Date.UTC(+observed.year, +observed.month - 1, +observed.day, +observed.hour, +observed.minute, +observed.second);
  }
  return new Date(instant);
}

function value(date: ReturnType<typeof calendarDate>) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function utcDate(date: ReturnType<typeof calendarDate>) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function rangeLabel(mode: NotasMode, start: ReturnType<typeof calendarDate>, end: ReturnType<typeof calendarDate>) {
  if (mode === "month") {
    return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(utcDate(start));
  }
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).formatRange(utcDate(start), utcDate(addDays(end, -1)));
}

export function parseNotasParams(input: Record<string, string | string[] | undefined>, now = new Date()) {
  const mode: NotasMode = input.mode === "month" ? "month" : "week";
  const payment: NotasPayment = ["all", "pending", "paid"].includes(String(input.payment)) ? input.payment as NotasPayment : "all";
  const assignee = normalizeAssignee(input.assignee);
  const page = /^\d+$/.test(String(input.page)) ? Math.max(1, Number(input.page)) : 1;
  const anchor = calendarDate(typeof input.anchor === "string" ? `${input.anchor}${mode === "month" && /^\d{4}-\d{2}$/.test(input.anchor) ? "-01" : ""}` : undefined, now);
  const weekday = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day)).getUTCDay();
  const startDate = mode === "month" ? { ...anchor, day: 1 } : addDays(anchor, -((weekday + 6) % 7));
  const endDate = mode === "month" ? { year: startDate.month === 12 ? startDate.year + 1 : startDate.year, month: startDate.month === 12 ? 1 : startDate.month + 1, day: 1 } : addDays(startDate, 6);
  const currentDate = calendarDate(undefined, now);
  const currentWeekday = new Date(Date.UTC(currentDate.year, currentDate.month - 1, currentDate.day)).getUTCDay();
  const currentWeekStart = addDays(currentDate, -((currentWeekday + 6) % 7));
  const isCurrentWeek = mode === "week" && value(startDate) === value(currentWeekStart);
  return { mode, payment, assignee, page, anchor: value(anchor), rangeLabel: rangeLabel(mode, startDate, endDate), isCurrentWeek, start: localMidnightUtc(startDate), end: localMidnightUtc(endDate) };
}

export function notasHref(state: { mode: NotasMode; payment: NotasPayment; assignee: NotasAssignee; anchor: string; page?: number }) {
  const params = new URLSearchParams({ mode: state.mode, anchor: state.mode === "month" ? state.anchor.slice(0, 7) : state.anchor, payment: state.payment, assignee: normalizeAssignee(state.assignee) });
  if (state.page && state.page > 1) params.set("page", String(state.page));
  return `/admin/notas?${params}`;
}
