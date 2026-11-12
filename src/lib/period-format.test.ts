import { describe, expect, it } from "vitest";
import {
  formatPeriodLabel,
  isCurrentPeriod,
  mexicoCityDateKey,
  shiftPeriodAnchor,
} from "./period-format";

// 2026-11-11 is a Wednesday. Its Monday-Saturday week is 9–14 Nov 2026.
const today = new Date("2026-11-11T18:00:00Z");

describe("formatPeriodLabel", () => {
  it("formats a week inside one month as a compact day range", () => {
    expect(formatPeriodLabel("week", "2026-11-11")).toBe("9–14 de noviembre de 2026");
    expect(formatPeriodLabel("week", "2026-11-09")).toBe("9–14 de noviembre de 2026");
  });

  it("names both months when a week crosses a month boundary in the same year", () => {
    expect(formatPeriodLabel("week", "2023-10-30")).toBe("30 de octubre – 4 de noviembre de 2023");
  });

  it("names both months and years when a week crosses a year boundary", () => {
    expect(formatPeriodLabel("week", "2026-12-28")).toBe("28 de diciembre de 2026 – 2 de enero de 2027");
  });

  it("covers seven days when the week length is configured for Monday-Sunday", () => {
    expect(formatPeriodLabel("week", "2026-11-11", { weekDays: 7 })).toBe("9–15 de noviembre de 2026");
  });

  it("formats a month as lowercase month name and year", () => {
    const label = formatPeriodLabel("month", "2026-11-11");
    expect(label).toBe("noviembre de 2026");
    expect(label).not.toMatch(/[A-ZÁÉÍÓÚÑ]/u);
  });

  it("formats a year as the bare year", () => {
    expect(formatPeriodLabel("year", "2026-11-11")).toBe("2026");
  });

  it("labels the all view as the full history", () => {
    expect(formatPeriodLabel("all", "2026-11-11")).toBe("Historial completo");
  });

  it("rejects anchors that are not real calendar dates", () => {
    expect(() => formatPeriodLabel("week", "2026-02-30")).toThrow(RangeError);
    expect(() => formatPeriodLabel("month", "2026-11")).toThrow(RangeError);
  });
});

describe("shiftPeriodAnchor", () => {
  it("moves a week by seven days", () => {
    expect(shiftPeriodAnchor("week", "2026-11-11", 1)).toBe("2026-11-16");
    expect(shiftPeriodAnchor("week", "2026-01-05", -1)).toBe("2025-12-29");
  });

  it("moves a month to the first day of the adjacent month, across years", () => {
    expect(shiftPeriodAnchor("month", "2026-11-11", 1)).toBe("2026-12-01");
    expect(shiftPeriodAnchor("month", "2026-12-15", 1)).toBe("2027-01-01");
  });

  it("moves a year to January first of the adjacent year", () => {
    expect(shiftPeriodAnchor("year", "2026-11-11", -1)).toBe("2025-01-01");
  });
});

describe("mexicoCityDateKey", () => {
  it("uses the Mexico City calendar day, not the UTC day", () => {
    expect(mexicoCityDateKey(new Date("2026-11-09T05:30:00Z"))).toBe("2026-11-08");
    expect(mexicoCityDateKey(new Date("2026-11-09T06:30:00Z"))).toBe("2026-11-09");
  });
});

describe("isCurrentPeriod", () => {
  it("is true only for the period that contains today in Mexico City", () => {
    expect(isCurrentPeriod("week", "2026-11-09", today)).toBe(true);
    expect(isCurrentPeriod("week", "2026-11-02", today)).toBe(false);
    expect(isCurrentPeriod("month", "2026-11-01", today)).toBe(true);
    expect(isCurrentPeriod("month", "2026-10-31", today)).toBe(false);
    expect(isCurrentPeriod("year", "2026-02-01", today)).toBe(true);
    expect(isCurrentPeriod("year", "2025-12-31", today)).toBe(false);
  });

  it("treats the all view as always current, since it has no period to move away from", () => {
    expect(isCurrentPeriod("all", "2019-01-01", today)).toBe(true);
  });

  it("decides the current week with the Mexico City day when UTC is already Monday", () => {
    const sundayInMexico = new Date("2026-11-09T05:30:00Z");
    expect(isCurrentPeriod("week", "2026-11-02", sundayInMexico)).toBe(true);
    expect(isCurrentPeriod("week", "2026-11-09", sundayInMexico)).toBe(false);
  });
});
