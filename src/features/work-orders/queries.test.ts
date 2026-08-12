import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getQuotePaidTotals } from "@/features/payments/queries";
import { listActiveWorkOrders, listCompletedWorkOrders } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { workOrder: { findMany: vi.fn() } },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("@/features/payments/queries", () => ({
  getQuotePaidTotals: vi.fn(),
}));

describe("work order operational queues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getQuotePaidTotals as ReturnType<typeof vi.fn>).mockResolvedValue(new Map());
  });

  it("queries ASSIGNED and IN_PROGRESS work for Trabajos", async () => {
    await listActiveWorkOrders();

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    }));
  });

  it("queries only COMPLETED work for Notas", async () => {
    await listCompletedWorkOrders();

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    }));
  });
});
