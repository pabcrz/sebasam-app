import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { nextQuoteNumber, nextWorkOrderNumber } from "./sequence";

describe("sequential quote/work-order numbers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00Z"));
    prismaMock.$queryRaw.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts quote numbers at C-MMYY-001 for an empty month", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "0" }]);

    await expect(nextQuoteNumber()).resolves.toBe("C-0626-001");
    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
  });

  it("increments quote numbers from the highest numeric suffix", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "41" }]);

    await expect(nextQuoteNumber()).resolves.toBe("C-0626-042");
  });

  it.each([
    ["100", "C-0626-101"],
    ["1000", "C-0626-1001"],
  ])("orders quote suffix %s numerically beyond fixed width", async (highestSequence, expected) => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence }]);

    await expect(nextQuoteNumber()).resolves.toBe(expected);
  });

  it("starts work order numbers at T-MMYY-01 for an empty month", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "0" }]);

    await expect(nextWorkOrderNumber()).resolves.toBe("T-0626-01");
  });

  it("keeps work order numeric ordering correct beyond its fixed width", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "100" }]);

    await expect(nextWorkOrderNumber()).resolves.toBe("T-0626-101");
  });

  it("uses a bounded aggregate query with parseInt-compatible malformed handling", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "7" }]);

    await nextQuoteNumber();

    const [strings, suffixStart, prefixPattern] = prismaMock.$queryRaw.mock.calls[0];
    const query = Array.from(strings as TemplateStringsArray).join("?");

    expect(query).toContain("MAX(parsed_suffix)");
    expect(query).toContain('FROM "Quote"');
    expect(query).toContain("substring(\"number\" FROM ?::integer)");
    expect(query).toContain("WHERE suffix !~ '-'");
    expect(query).toContain("regexp_match(suffix, '^[[:space:]]*[+]?[0-9]+'");
    expect(query).toContain("parsed_suffix <= '1.7976931348623157e308'::numeric");
    expect(suffixStart).toBe(8);
    expect(prefixPattern).toBe("C-0626-%");
    expect(query).not.toContain("C-0626-");
  });

  it("queries the work order table with separately bound parameters", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "1" }]);

    await nextWorkOrderNumber();

    const [strings, suffixStart, prefixPattern] = prismaMock.$queryRaw.mock.calls[0];
    const query = Array.from(strings as TemplateStringsArray).join("?");

    expect(query).toContain('FROM "WorkOrder"');
    expect(query).toContain("substring(\"number\" FROM ?::integer)");
    expect(suffixStart).toBe(8);
    expect(prefixPattern).toBe("T-0626-%");
  });
});
