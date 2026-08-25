import { describe, expect, it } from "vitest";
import { getDashboardPeriodRanges } from "./period";

describe("dashboard period utilities", () => {
  it("computes correct week, month, and year boundaries in America/Mexico_City", () => {
    // Wednesday 2026-08-19 14:30:00 UTC (08:30 in Mexico City, UTC-6)
    const now = new Date("2026-08-19T14:30:00.000Z");
    const ranges = getDashboardPeriodRanges(now);

    // Week: Monday Aug 17 00:00:00 CST (06:00:00 UTC) to Sunday Aug 23 00:00:00 CST (06:00:00 UTC)
    expect(ranges.week.startDate.toISOString()).toBe("2026-08-17T06:00:00.000Z");
    expect(ranges.week.endDate.toISOString()).toBe("2026-08-23T06:00:00.000Z");
    expect(ranges.week.rangeLabel).toMatch(/17.*22.*ago/i);

    // Month: Aug 1 00:00:00 CST (06:00:00 UTC) to Sep 1 00:00:00 CST (06:00:00 UTC)
    expect(ranges.month.startDate.toISOString()).toBe("2026-08-01T06:00:00.000Z");
    expect(ranges.month.endDate.toISOString()).toBe("2026-09-01T06:00:00.000Z");
    expect(ranges.month.rangeLabel.toLowerCase()).toContain("agosto");

    // Year: Jan 1 2026 00:00:00 CST (06:00:00 UTC) to Jan 1 2027 00:00:00 CST (06:00:00 UTC)
    expect(ranges.year.startDate.toISOString()).toBe("2026-01-01T06:00:00.000Z");
    expect(ranges.year.endDate.toISOString()).toBe("2027-01-01T06:00:00.000Z");
    expect(ranges.year.rangeLabel).toBe("2026");
  });

  it("handles Sunday correctly by keeping it as the end boundary of the active work week", () => {
    // Sunday 2026-08-23 18:00:00 UTC (12:00 in Mexico City)
    const sundayNow = new Date("2026-08-23T18:00:00.000Z");
    const ranges = getDashboardPeriodRanges(sundayNow);

    // If anchor is Sunday, weekday offset gives Monday of that ending week
    expect(ranges.week.startDate.toISOString()).toBe("2026-08-17T06:00:00.000Z");
    expect(ranges.week.endDate.toISOString()).toBe("2026-08-23T06:00:00.000Z");
  });

  it("handles year transition for December correctly", () => {
    // 2026-12-15
    const decNow = new Date("2026-12-15T18:00:00.000Z");
    const ranges = getDashboardPeriodRanges(decNow);

    expect(ranges.month.startDate.toISOString()).toBe("2026-12-01T06:00:00.000Z");
    expect(ranges.month.endDate.toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });
});
