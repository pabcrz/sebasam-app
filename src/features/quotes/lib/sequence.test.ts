import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  nextQuoteNumber,
  nextWorkOrderNumber,
  QUOTE_NUMBER_MAX_RETRIES,
  withQuoteNumberRetry,
} from "./sequence";

function quoteNumberConflict(target: string[]) {
  return new Prisma.PrismaClientKnownRequestError("Quote number already exists", {
    code: "P2002",
    clientVersion: "test",
    meta: { target },
  });
}

describe("sequential quote/work-order numbers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00Z"));
    prismaMock.$queryRaw.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts quote numbers at MMYY-001 for an empty month", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "0" }]);

    await expect(nextQuoteNumber()).resolves.toBe("0626-001");
    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
  });

  it("increments quote numbers from the highest numeric suffix", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ highestSequence: "41" }]);

    await expect(nextQuoteNumber()).resolves.toBe("0626-042");
  });

  it.each([
    ["100", "0626-101"],
    ["1000", "0626-1001"],
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

    const [strings, suffixStart, prefixPattern, legacySuffixStart, legacyPrefixPattern] = prismaMock.$queryRaw.mock.calls[0];
    const query = Array.from(strings as TemplateStringsArray).join("?");

    expect(query).toContain("MAX(parsed_suffix)");
    expect(query).toContain('FROM "Quote"');
    expect(query).toContain('AND "deletedAt" IS NULL');
    expect(query).toContain("substring(\"number\" FROM ?::integer)");
    expect(query).toContain("WHERE suffix !~ '-'");
    expect(query).toContain("regexp_match(suffix, '^[[:space:]]*[+]?[0-9]+'");
    expect(query).toContain("parsed_suffix <= '1.7976931348623157e308'::numeric");
    expect(suffixStart).toBe(6);
    expect(prefixPattern).toBe("0626-%");
    expect(legacySuffixStart).toBe(8);
    expect(legacyPrefixPattern).toBe("C-0626-%");
    expect(query).not.toContain("0626-");
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

  it("retries the complete transaction after a Quote.number collision", async () => {
    const transaction = vi.fn()
      .mockRejectedValueOnce(quoteNumberConflict(["number"]))
      .mockResolvedValueOnce("created");

    await expect(withQuoteNumberRetry(transaction)).resolves.toBe("created");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry an unrelated unique constraint error", async () => {
    const error = quoteNumberConflict(["submissionKey"]);
    const transaction = vi.fn().mockRejectedValue(error);

    await expect(withQuoteNumberRetry(transaction)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("propagates a Quote.number collision after the explicit retry limit", async () => {
    const error = quoteNumberConflict(["number"]);
    const transaction = vi.fn().mockRejectedValue(error);

    await expect(withQuoteNumberRetry(transaction)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(QUOTE_NUMBER_MAX_RETRIES + 1);
  });
});
