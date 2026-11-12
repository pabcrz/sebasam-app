import { describe, expect, it } from "vitest";
import { formatHomeDate, greetingFor, pendingLabel } from "./greeting";

// Mexico City has no DST since 2022: UTC-6 all year.
describe("greetingFor", () => {
  it("greets by the Mexico City hour, switching at 12:00 and 19:00", () => {
    expect(greetingFor(new Date("2026-11-11T14:00:00.000Z"))).toBe("Buen día"); // 08:00
    expect(greetingFor(new Date("2026-11-11T17:59:00.000Z"))).toBe("Buen día"); // 11:59
    expect(greetingFor(new Date("2026-11-11T18:00:00.000Z"))).toBe("Buenas tardes"); // 12:00
    expect(greetingFor(new Date("2026-11-12T00:59:00.000Z"))).toBe("Buenas tardes"); // 18:59
    expect(greetingFor(new Date("2026-11-12T01:00:00.000Z"))).toBe("Buenas noches"); // 19:00
  });
});

describe("formatHomeDate", () => {
  it("writes the weekday capitalized and the rest lowercase, in Spanish", () => {
    expect(formatHomeDate(new Date("2026-11-11T18:00:00.000Z"))).toBe("Miércoles 11 de noviembre");
  });

  it("uses the Mexico City calendar day, not UTC", () => {
    // 2026-11-12 03:00 UTC is still 2026-11-11 21:00 in Mexico City.
    expect(formatHomeDate(new Date("2026-11-12T03:00:00.000Z"))).toBe("Miércoles 11 de noviembre");
  });
});

describe("pendingLabel", () => {
  it("uses the singular only for exactly one item", () => {
    expect(pendingLabel(0)).toBe("0 pendientes");
    expect(pendingLabel(1)).toBe("1 pendiente");
    expect(pendingLabel(17)).toBe("17 pendientes");
  });
});
