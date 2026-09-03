import { describe, expect, it } from "vitest";
import {
  formatMonthPayrollRangeLabel,
  formatPayrollRangeLabel,
  parsePayrollParams,
  payrollHref,
} from "./period";

describe("Payroll Period Logic", () => {
  it("uses a Monday-through-Saturday range for a given Wednesday in weekly mode", () => {
    // 2026-08-19 is Wednesday
    const fixedDate = new Date("2026-08-19T12:00:00Z");
    const params = parsePayrollParams({ anchor: "2026-08-19" }, fixedDate);

    expect(params.mode).toBe("weekly");
    // Monday is inclusive and Sunday 00:00 in Mexico City is exclusive.
    expect(params.anchor).toBe("2026-08-17");
    expect(params.prevAnchor).toBe("2026-08-10");
    expect(params.nextAnchor).toBe("2026-08-24");
    expect(params.isCurrentWeek).toBe(true);
    expect(params.isCurrentPeriod).toBe(true);
    expect(params.start.toISOString()).toBe("2026-08-17T06:00:00.000Z");
    expect(params.end.toISOString()).toBe("2026-08-23T06:00:00.000Z");
    expect(new Date("2026-08-23T05:59:59.999Z").getTime()).toBeLessThan(params.end.getTime());
    expect(new Date("2026-08-23T06:00:00.000Z").getTime()).toBe(params.end.getTime());
    expect(params.rangeLabel).toContain("17");
    expect(params.rangeLabel).toContain("22");
    expect(params.rangeLabel).toContain("agosto");
  });

  it("formats weekly range label properly with formatPayrollRangeLabel", () => {
    const start = { year: 2026, month: 8, day: 17 };
    const end = { year: 2026, month: 8, day: 23 };
    const label = formatPayrollRangeLabel(start, end);
    expect(label).toMatch(/17.*22.*agosto.*2026/i);
  });

  it("identifies past or future weeks accurately", () => {
    const today = new Date("2026-08-24T12:00:00Z"); // Monday Aug 24
    const pastWeekParams = parsePayrollParams({ anchor: "2026-08-10" }, today);

    expect(pastWeekParams.mode).toBe("weekly");
    expect(pastWeekParams.anchor).toBe("2026-08-10");
    expect(pastWeekParams.isCurrentWeek).toBe(false);
    expect(pastWeekParams.prevAnchor).toBe("2026-08-03");
    expect(pastWeekParams.nextAnchor).toBe("2026-08-17");
  });

  it("parses monthly periods accurately from month start to next month start", () => {
    const fixedDate = new Date("2026-08-19T12:00:00Z");
    const params = parsePayrollParams({ mode: "monthly", anchor: "2026-08" }, fixedDate);

    expect(params.mode).toBe("monthly");
    expect(params.anchor).toBe("2026-08-01");
    expect(params.prevAnchor).toBe("2026-07-01");
    expect(params.nextAnchor).toBe("2026-09-01");
    expect(params.isCurrentPeriod).toBe(true);
    expect(params.start.toISOString()).toBe("2026-08-01T06:00:00.000Z");
    expect(params.end.toISOString()).toBe("2026-09-01T06:00:00.000Z");
    expect(params.rangeLabel).toMatch(/Agosto.*2026/i);
  });

  it("handles previous and next months across year boundaries in monthly mode", () => {
    const fixedDate = new Date("2026-01-15T12:00:00Z");
    const params = parsePayrollParams({ mode: "monthly", anchor: "2026-01-01" }, fixedDate);

    expect(params.mode).toBe("monthly");
    expect(params.anchor).toBe("2026-01-01");
    expect(params.prevAnchor).toBe("2025-12-01");
    expect(params.nextAnchor).toBe("2026-02-01");
    expect(params.isCurrentPeriod).toBe(true);
  });

  it("formats monthly range label properly with formatMonthPayrollRangeLabel", () => {
    const label = formatMonthPayrollRangeLabel({ year: 2026, month: 8, day: 1 });
    expect(label).toMatch(/Agosto.*2026/i);
  });

  it("uses Mexico City local midnight for historical DST weeks", () => {
    const params = parsePayrollParams(
      { anchor: "2022-10-26" },
      new Date("2022-10-26T12:00:00.000Z")
    );

    expect(params.start.toISOString()).toBe("2022-10-24T05:00:00.000Z");
    expect(params.end.toISOString()).toBe("2022-10-30T05:00:00.000Z");
    expect(params.rangeLabel).toMatch(/24.*29.*octubre.*2022/i);
  });

  it("constructs correct payroll href with query parameters", () => {
    expect(payrollHref()).toBe("/admin/nomina");
    expect(payrollHref("2026-08-17")).toBe("/admin/nomina?anchor=2026-08-17");
    expect(payrollHref({ mode: "monthly", anchor: "2026-08-01" })).toBe(
      "/admin/nomina?mode=monthly&anchor=2026-08-01"
    );
    expect(payrollHref({ mode: "weekly", anchor: "2026-08-17" })).toBe(
      "/admin/nomina?anchor=2026-08-17"
    );
  });
});
