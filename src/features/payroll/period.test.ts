import { describe, expect, it } from "vitest";
import { formatPayrollRangeLabel, parsePayrollParams, payrollHref } from "./period";

describe("Payroll Period Logic", () => {
  it("uses a Monday-through-Saturday range for a given Wednesday", () => {
    // 2026-08-19 is Wednesday
    const fixedDate = new Date("2026-08-19T12:00:00Z");
    const params = parsePayrollParams({ anchor: "2026-08-19" }, fixedDate);

    // Monday is inclusive and Sunday 00:00 in Mexico City is exclusive.
    expect(params.anchor).toBe("2026-08-17");
    expect(params.prevAnchor).toBe("2026-08-10");
    expect(params.nextAnchor).toBe("2026-08-24");
    expect(params.isCurrentWeek).toBe(true);
    expect(params.start.toISOString()).toBe("2026-08-17T06:00:00.000Z");
    expect(params.end.toISOString()).toBe("2026-08-23T06:00:00.000Z");
    expect(new Date("2026-08-23T05:59:59.999Z").getTime()).toBeLessThan(params.end.getTime());
    expect(new Date("2026-08-23T06:00:00.000Z").getTime()).toBe(params.end.getTime());
    expect(params.rangeLabel).toContain("17");
    expect(params.rangeLabel).toContain("22");
    expect(params.rangeLabel).toContain("agosto");
  });

  it("formats range label properly with formatPayrollRangeLabel", () => {
    const start = { year: 2026, month: 8, day: 17 };
    const end = { year: 2026, month: 8, day: 23 };
    const label = formatPayrollRangeLabel(start, end);
    expect(label).toMatch(/17.*22.*agosto.*2026/i);
  });

  it("identifies past or future weeks accurately", () => {
    const today = new Date("2026-08-24T12:00:00Z"); // Monday Aug 24
    const pastWeekParams = parsePayrollParams({ anchor: "2026-08-10" }, today);

    expect(pastWeekParams.anchor).toBe("2026-08-10");
    expect(pastWeekParams.isCurrentWeek).toBe(false);
    expect(pastWeekParams.prevAnchor).toBe("2026-08-03");
    expect(pastWeekParams.nextAnchor).toBe("2026-08-17");
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
  });
});
