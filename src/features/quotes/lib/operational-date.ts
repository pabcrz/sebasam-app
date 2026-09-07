const mexicoCityTimeZone = "America/Mexico_City";
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function mexicoCityDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: mexicoCityTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
  };
}

export function mexicoCityCalendarDate(now = new Date()) {
  const { year, month, day } = mexicoCityDateParts(now);
  return `${year}-${month}-${day}`;
}

export function isSundayOperationalDate(calendarDate: string): boolean {
  if (!calendarDatePattern.test(calendarDate)) return false;
  const [year, month, day] = calendarDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCDay() === 0;
}

export function defaultOperationalCalendarDate(now = new Date()): string {
  const today = mexicoCityCalendarDate(now);
  if (isSundayOperationalDate(today)) {
    // If current day in Mexico City is Sunday, fall back to Saturday
    const [year, month, day] = today.split("-").map(Number);
    const saturday = new Date(Date.UTC(year, month - 1, day - 1));
    const sYear = saturday.getUTCFullYear();
    const sMonth = String(saturday.getUTCMonth() + 1).padStart(2, "0");
    const sDay = String(saturday.getUTCDate()).padStart(2, "0");
    return `${sYear}-${sMonth}-${sDay}`;
  }
  return today;
}

export function normalizeOperationalDate(value: string | undefined, now = new Date()) {
  const calendarDate = value ?? defaultOperationalCalendarDate(now);

  if (!calendarDatePattern.test(calendarDate)) {
    throw new Error("Operational date must be a valid YYYY-MM-DD date.");
  }

  const [year, month, day] = calendarDate.split("-").map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error("Operational date must be a real calendar date.");
  }

  if (calendarDate > mexicoCityCalendarDate(now)) {
    throw new Error("Operational date cannot be in the future.");
  }

  if (normalized.getUTCDay() === 0) {
    throw new Error("No se pueden registrar trabajos en domingo. Ingresa una fecha válida de lunes a sábado.");
  }

  return normalized;
}

export function localDateToMexicoCityInstant(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: mexicoCityTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    instant +=
      target -
      Date.UTC(
        +v.year!,
        +v.month! - 1,
        +v.day!,
        +v.hour!,
        +v.minute!,
        +v.second!,
      );
  }
  return new Date(instant);
}

export function operationalDateToCompletedAt(value: string | undefined, now = new Date()): Date {
  const calendarDate = value ?? defaultOperationalCalendarDate(now);

  if (!calendarDatePattern.test(calendarDate)) {
    throw new Error("Operational date must be a valid YYYY-MM-DD date.");
  }

  const [year, month, day] = calendarDate.split("-").map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error("Operational date must be a real calendar date.");
  }

  const todayMexicoCity = mexicoCityCalendarDate(now);
  if (calendarDate > todayMexicoCity) {
    throw new Error("Operational date cannot be in the future.");
  }

  if (normalized.getUTCDay() === 0) {
    throw new Error("No se pueden registrar trabajos en domingo. Ingresa una fecha válida de lunes a sábado.");
  }

  if (calendarDate === todayMexicoCity) {
    return now;
  }

  return localDateToMexicoCityInstant(year, month, day, 12, 0, 0);
}
