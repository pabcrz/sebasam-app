import { describe, expect, it } from "vitest";
import { endOfDay, hasFilterValue, optionalDate, optionalTrimmedString, startOfDay } from "./filters";

describe("optionalTrimmedString", () => {
  it("returns undefined for empty strings", () => {
    const schema = optionalTrimmedString();

    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse("   ")).toBeUndefined();
  });

  it("trims and returns non-empty strings", () => {
    const schema = optionalTrimmedString();

    expect(schema.parse("  hello  ")).toBe("hello");
  });

  it("returns undefined for non-string values", () => {
    const schema = optionalTrimmedString();

    expect(schema.parse(undefined)).toBeUndefined();
    expect(schema.parse(null)).toBeUndefined();
  });
});

describe("optionalDate", () => {
  it("returns undefined for empty or invalid values", () => {
    const schema = optionalDate();

    expect(schema.parse("")).toBeUndefined();
    expect(schema.parse("not-a-date")).toBeUndefined();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("parses a YYYY-MM-DD date string as a local calendar day", () => {
    const schema = optionalDate();
    const result = schema.parse("2026-07-01");

    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(6);
    expect(result?.getDate()).toBe(1);
    expect(result?.getHours()).toBe(0);
  });
});

describe("endOfDay", () => {
  it("returns the last millisecond of the given date in local time", () => {
    const date = new Date(2026, 6, 1, 8, 30);

    const result = endOfDay(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it("keeps date-only values on the same local calendar day", () => {
    const schema = optionalDate();
    const date = schema.parse("2026-07-01");

    expect(date).toBeInstanceOf(Date);
    const result = endOfDay(date as Date);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(1);
    expect(result.getHours()).toBe(23);
  });
});

describe("startOfDay", () => {
  it("returns the first millisecond of the given date in local time", () => {
    const date = new Date(2026, 6, 1, 8, 30);

    const result = startOfDay(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe("hasFilterValue", () => {
  it("returns false when all values are empty", () => {
    expect(hasFilterValue({ a: "", b: undefined, c: null })).toBe(false);
  });

  it("returns true when any string value is non-empty", () => {
    expect(hasFilterValue({ a: "", b: "active" })).toBe(true);
  });

  it("returns true when any date value is valid", () => {
    expect(hasFilterValue({ a: undefined, b: new Date("2026-07-01") })).toBe(true);
  });

  it("returns false for invalid dates", () => {
    expect(hasFilterValue({ a: new Date("invalid") })).toBe(false);
  });
});
