import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listActiveWorkOrders, listCompletedWorkOrders } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn(), workOrder: { findMany: vi.fn() } },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

describe("work order operational queues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("queries ASSIGNED and IN_PROGRESS work for Trabajos", async () => {
    await listActiveWorkOrders();

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    }));
  });

  it.each(["all", "pending", "paid"] as const)("filters and paginates %s Notas before hydration", async (payment) => {
    await listCompletedWorkOrders({ start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment, page: 2 });
    const query = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const sql = query.strings.join("?");
    expect(sql).toContain('wo.status::text = ?');
    expect(sql).toContain('wo."completedAt" >= ?');
    expect(sql).toContain('wo."completedAt" < ?');
    expect(sql).toContain('ORDER BY wo."completedAt" DESC, wo.id DESC LIMIT ? OFFSET ?');
    expect(sql.includes("HAVING")).toBe(payment !== "all");
    if (payment === "pending") expect(sql).toMatch(/HAVING .* > 0/);
    if (payment === "paid") expect(sql).toMatch(/HAVING .* = 0/);
    expect(query.values).toEqual(expect.arrayContaining(["PAID", "COMPLETED", 21, 20]));
    expect(prisma.workOrder.findMany).not.toHaveBeenCalled();
  });

  it("reports an empty page and detects the next page without unbounded hydration", async () => {
    const input = { start: new Date("2026-08-03T06:00:00Z"), end: new Date("2026-08-10T06:00:00Z"), payment: "all" as const, page: 1 };
    const empty = await listCompletedWorkOrders(input);
    expect(empty).toMatchObject({ workOrders: [], hasNextPage: false });
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({ id: String(index), paidCents: BigInt(0) })));
    const bounded = await listCompletedWorkOrders(input);
    expect(bounded.hasNextPage).toBe(true);
    expect(prisma.workOrder.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: { in: Array.from({ length: 20 }, (_, index) => String(index)) } } }));
  });
});
