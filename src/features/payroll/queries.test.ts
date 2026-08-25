import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getWeeklyPayroll } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workOrder: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

describe("Payroll Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("queries completed work orders within the weekly window", async () => {
    const report = await getWeeklyPayroll({ anchor: "2026-08-19" });

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "COMPLETED",
          completedAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );

    expect(report.rangeLabel).toMatch(/17.*23.*agosto.*2026/i);
    expect(report.totalCompletedOrders).toBe(0);
    expect(report.workers).toEqual([]);
  });
});
