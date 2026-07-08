import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  quote: {
    findMany: vi.fn(),
  },
  workOrder: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { nextQuoteNumber, nextWorkOrderNumber } from "./sequence";

describe("sequential quote/work-order numbers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T12:00:00Z"));
    prismaMock.quote.findMany.mockReset();
    prismaMock.workOrder.findMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts quote numbers at C-MMYY-001 for an empty month", async () => {
    prismaMock.quote.findMany.mockResolvedValue([]);

    await expect(nextQuoteNumber()).resolves.toBe("C-0626-001");
    expect(prismaMock.quote.findMany).toHaveBeenCalledWith({
      where: { number: { startsWith: "C-0626-" } },
      select: { number: true },
    });
  });

  it("increments quote numbers using numeric suffixes, not string order", async () => {
    prismaMock.quote.findMany.mockResolvedValue([
      { number: "C-0626-99" },
      { number: "C-0626-100" },
      { number: "C-0626-invalid" },
    ]);

    await expect(nextQuoteNumber()).resolves.toBe("C-0626-101");
  });

  it("keeps compatibility with existing two-digit quote numbers", async () => {
    prismaMock.quote.findMany.mockResolvedValue([
      { number: "C-0626-03" },
      { number: "C-0626-004" },
    ]);

    await expect(nextQuoteNumber()).resolves.toBe("C-0626-005");
  });

  it("starts work order numbers at T-MMYY-01 for an empty month", async () => {
    prismaMock.workOrder.findMany.mockResolvedValue([]);

    await expect(nextWorkOrderNumber()).resolves.toBe("T-0626-01");
    expect(prismaMock.workOrder.findMany).toHaveBeenCalledWith({
      where: { number: { startsWith: "T-0626-" } },
      select: { number: true },
    });
  });

  it("increments work order numbers using numeric suffixes, not string order", async () => {
    prismaMock.workOrder.findMany.mockResolvedValue([
      { number: "T-0626-99" },
      { number: "T-0626-100" },
      { number: "T-0626-invalid" },
    ]);

    await expect(nextWorkOrderNumber()).resolves.toBe("T-0626-101");
  });
});
