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

export function normalizeOperationalDate(value: string | undefined, now = new Date()) {
  const calendarDate = value ?? mexicoCityCalendarDate(now);

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

  return normalized;
}
