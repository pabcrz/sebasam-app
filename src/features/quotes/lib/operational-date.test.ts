import { afterEach, describe, expect, it, vi } from "vitest";
import { mexicoCityCalendarDate, normalizeOperationalDate } from "./operational-date";

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
});
