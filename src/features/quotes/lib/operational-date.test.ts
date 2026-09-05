import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localDateToMexicoCityInstant,
  mexicoCityCalendarDate,
  normalizeOperationalDate,
  operationalDateToCompletedAt,
} from "./operational-date";

describe("operational date normalization", () => {
  afterEach(() => vi.useRealTimers());

  it("derives server today in Mexico City without a UTC day shift", () => {
    const now = new Date("2026-07-15T01:30:00.000Z");

    expect(mexicoCityCalendarDate(now)).toBe("2026-07-14");
    expect(normalizeOperationalDate(undefined, now)).toEqual(new Date("2026-07-14T00:00:00.000Z"));
  });

  it("accepts a real past calendar date at UTC midnight", () => {
    expect(normalizeOperationalDate("2026-02-28", new Date("2026-07-15T18:00:00.000Z")))
      .toEqual(new Date("2026-02-28T00:00:00.000Z"));
  });

  it.each(["2026-02-29", "2026-7-1", "2026-07-32", "2026-07-16"])(
    "rejects malformed, impossible, or future input %s",
    (value) => {
      expect(() => normalizeOperationalDate(value, new Date("2026-07-15T18:00:00.000Z"))).toThrow();
    },
  );

  describe("operationalDateToCompletedAt", () => {
    it("assigns completedAt to the past selected date in America/Mexico_City, not capture time", () => {
      // Captured on Saturday 2026-09-05 at 15:00 UTC
      const saturdayCapture = new Date("2026-09-05T15:00:00.000Z");
      // Work was actually completed on Monday 2026-08-31
      const completedAt = operationalDateToCompletedAt("2026-08-31", saturdayCapture);

      // Verify that completedAt belongs to Monday 2026-08-31 in America/Mexico_City
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      expect(formatter.format(completedAt)).toBe("2026-08-31");
      expect(completedAt).toEqual(new Date("2026-08-31T18:00:00.000Z"));
      expect(completedAt).not.toEqual(saturdayCapture);
    });

    it("uses now when the selected date matches today in Mexico City", () => {
      const now = new Date("2026-09-05T15:30:00.000Z");
      const today = mexicoCityCalendarDate(now);
      const completedAt = operationalDateToCompletedAt(today, now);

      expect(completedAt).toBe(now);
    });

    it("rejects future dates relative to current Mexico City date", () => {
      const now = new Date("2026-09-05T15:00:00.000Z");
      expect(() => operationalDateToCompletedAt("2026-09-06", now)).toThrow(/future/i);
    });

    it("respects day boundaries in America/Mexico_City without shifting to previous day", () => {
      const instant = localDateToMexicoCityInstant(2026, 8, 31, 12, 0, 0);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
      const parts = Object.fromEntries(formatter.formatToParts(instant).map((p) => [p.type, p.value]));
      expect(parts.year).toBe("2026");
      expect(parts.month).toBe("08");
      expect(parts.day).toBe("31");
      expect(parts.hour).toBe("12");
    });
  });
});
