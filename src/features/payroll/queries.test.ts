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

    // The weekly payroll range runs Monday through Saturday; Sunday is the exclusive boundary.
    expect(report.rangeLabel).toBe("17–22 de agosto de 2026");
    expect(report.totalCompletedOrders).toBe(0);
    expect(report.workers).toEqual([]);
  });

  it("maps customPayrollBaseCents from database items and reflects adjusted commission", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wo-1",
        number: "OT-001",
        status: "COMPLETED",
        completedAt: new Date("2026-08-19T12:00:00Z"),
        isSpecial: false,
        specialAssigneeName: null,
        quote: {
          id: "q-1",
          number: "COT-001",
          customer: { name: "Transportes Norte" },
          vehicle: { brand: "Kenworth", model: "T680", year: 2022, plate: "77-AA-1" },
          items: [
            {
              id: "item-1",
              type: "LABOR",
              description: "Alineación de dirección",
              quantity: 1,
              unitPriceCents: 120000,
              totalCents: 120000,
              includeInPayroll: false,
              customRatePercent: null,
              customPayrollBaseCents: 100000, // Adjusted base: $1,000.00 vs $1,200.00 client total
            },
          ],
          sections: [],
        },
        assignments: [
          {
            workerId: "worker-1",
            status: "ASSIGNED",
            worker: {
              id: "worker-1",
              displayName: "Maestro Pedro",
              workerKind: "MASTER",
              role: "OPERATIONAL",
            },
          },
        ],
      },
    ]);

    const report = await getWeeklyPayroll({ anchor: "2026-08-19" });

    expect(report.totalCompletedOrders).toBe(1);
    expect(report.workers).toHaveLength(1);
    const worker = report.workers[0];
    expect(worker.displayName).toBe("Maestro Pedro");
    expect(worker.totalClientLaborCents).toBe(120000); // $1,200.00 charged to client
    expect(worker.totalPayrollBaseCents).toBe(100000); // $1,000.00 base for payroll
    expect(worker.totalCommissionCents).toBe(50000); // 50% of $1,000.00 = $500.00

    const orderDetail = worker.workOrders[0];
    expect(orderDetail.totalClientLaborCents).toBe(120000);
    expect(orderDetail.totalPayrollBaseCents).toBe(100000);
    expect(orderDetail.totalCommissionCents).toBe(50000);

    const evaluatedItem = orderDetail.items[0];
    expect(evaluatedItem.clientTotalCents).toBe(120000);
    expect(evaluatedItem.payrollBaseCents).toBe(100000);
    expect(evaluatedItem.commissionCents).toBe(50000);
  });
});
