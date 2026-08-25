export const TIME_ZONE = "America/Mexico_City";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface DashboardPeriodRange {
  startDate: Date;
  endDate: Date;
  rangeLabel: string;
}

export interface DashboardPeriodRanges {
  week: DashboardPeriodRange;
  month: DashboardPeriodRange;
  year: DashboardPeriodRange;
}

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

export function getCalendarDate(value?: string, fallback = new Date()): CalendarDate {
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
    return getCalendarDate(undefined, fallback);
  }
  return result;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function localMidnightUtc(date: CalendarDate): Date {
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

function utcDate(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function formatWeekRangeLabel(start: CalendarDate, endExclusive: CalendarDate): string {
  const lastActiveDay = addDays(endExclusive, -1);
  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return formatter.formatRange(utcDate(start), utcDate(lastActiveDay));
}

export function formatMonthRangeLabel(start: CalendarDate): string {
  const formatter = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return formatter.format(utcDate(start));
}

export function getDashboardPeriodRanges(now = new Date()): DashboardPeriodRanges {
  const anchor = getCalendarDate(undefined, now);
  const weekday = new Date(Date.UTC(anchor.year, anchor.month - 1, anchor.day)).getUTCDay();
  // Monday as start of work week (offset 0 for Mon, 1 for Tue, ..., 6 for Sun)
  const mondayOffset = (weekday + 6) % 7;
  const weekStartCalendar = addDays(anchor, -mondayOffset);
  // Week runs Monday 00:00 to Sunday 00:00 (exclusive)
  const weekEndCalendar = addDays(weekStartCalendar, 6);

  const monthStartCalendar: CalendarDate = { year: anchor.year, month: anchor.month, day: 1 };
  const nextMonthStartCalendar: CalendarDate = {
    year: anchor.month === 12 ? anchor.year + 1 : anchor.year,
    month: anchor.month === 12 ? 1 : anchor.month + 1,
    day: 1,
  };

  const yearStartCalendar: CalendarDate = { year: anchor.year, month: 1, day: 1 };
  const nextYearStartCalendar: CalendarDate = { year: anchor.year + 1, month: 1, day: 1 };

  return {
    week: {
      startDate: localMidnightUtc(weekStartCalendar),
      endDate: localMidnightUtc(weekEndCalendar),
      rangeLabel: formatWeekRangeLabel(weekStartCalendar, weekEndCalendar),
    },
    month: {
      startDate: localMidnightUtc(monthStartCalendar),
      endDate: localMidnightUtc(nextMonthStartCalendar),
      rangeLabel: formatMonthRangeLabel(monthStartCalendar),
    },
    year: {
      startDate: localMidnightUtc(yearStartCalendar),
      endDate: localMidnightUtc(nextYearStartCalendar),
      rangeLabel: String(anchor.year),
    },
  };
}
