/**
 * Home greeting, date and pending count. Every reading is a Mexico City
 * calendar reading, whatever the server or browser time zone.
 */

const TIME_ZONE = "America/Mexico_City";

function mexicoCityHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
}

/** Buen día until noon, Buenas tardes until 19:00, then Buenas noches. */
export function greetingFor(now: Date): string {
  const hour = mexicoCityHour(now);
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** "Miércoles 11 de noviembre": weekday capitalized, the rest lowercase, no comma after the weekday. */
export function formatHomeDate(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const weekday = String(parts.weekday);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${parts.day} de ${parts.month}`;
}

export function pendingLabel(count: number): string {
  return `${count} ${count === 1 ? "pendiente" : "pendientes"}`;
}
