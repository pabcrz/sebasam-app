import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getWeeklyPayroll } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workOrder: { findMany: vi.fn() },
    userProfile: { findMany: vi.fn() },
    helperPayrollWeek: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

describe("Payroll Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.userProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.helperPayrollWeek.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
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

  it("uses captured helper rates and adjustments instead of later worker configuration", async () => {
    (prisma.helperPayrollWeek.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        workerId: "helper-1",
        weeklyRateCents: 6_00000,
        dailyRateCents: 1_00000,
        absenceDays: 1,
        manualCommissionCents: 2_5000,
        worker: { id: "helper-1", displayName: "Helper One" },
      },
    ]);
    (prisma.userProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "helper-1",
        displayName: "Helper One",
        fixedWeeklyPayCents: 8_00000,
        fixedDailyPayCents: 1_30000,
      },
    ]);

    const report = await getWeeklyPayroll({ anchor: "2026-08-19" });

    expect(report.fixedPayHelpers).toEqual([
      expect.objectContaining({
        workerId: "helper-1",
        weeklyRateCents: 6_00000,
        dailyRateCents: 1_00000,
        absenceDays: 1,
        absenceDeductionCents: 1_00000,
        manualCommissionCents: 2_5000,
        totalPayableCents: 5_25000,
      }),
    ]);
    expect(report.totalPayableCents).toBe(5_25000);
    expect(prisma.helperPayrollWeek.upsert).not.toHaveBeenCalled();
  });

  it("captures configured helper rates once for a new payroll week", async () => {
    (prisma.userProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "helper-1",
        displayName: "Helper One",
        fixedWeeklyPayCents: 6_00000,
        fixedDailyPayCents: 1_00000,
      },
    ]);
    (prisma.helperPayrollWeek.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      workerId: "helper-1",
      weeklyRateCents: 6_00000,
      dailyRateCents: 1_00000,
      absenceDays: 0,
      manualCommissionCents: 0,
    });

    const report = await getWeeklyPayroll({ anchor: "2026-08-19" });

    expect(prisma.helperPayrollWeek.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          weeklyRateCents: 6_00000,
          dailyRateCents: 1_00000,
        }),
      })
    );
    expect(report.fixedPayHelpers?.[0]).toEqual(
      expect.objectContaining({
        workerId: "helper-1",
        totalPayableCents: 6_00000,
      })
    );
  });

  it("remains driven by corrected quote concepts after completed-work correction", async () => {
    (prisma.workOrder.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "wo-corrected",
        number: "OT-CORR",
        status: "COMPLETED",
        completedAt: new Date("2026-08-19T12:00:00Z"),
        isSpecial: false,
        specialAssigneeName: null,
        quote: {
          id: "q-corrected",
          number: "COT-CORR",
          customer: { name: "Cliente Corrección" },
          vehicle: { brand: "Kenworth", model: "T680", year: 2022, plate: "CORR-1" },
          items: [
            {
              id: "item-corr-weld",
              type: "LABOR",
              description: "Soldadura de escape corregida",
              quantity: 1,
              unitPriceCents: 150000,
              totalCents: 150000,
              includeInPayroll: false,
              customRatePercent: null,
              customPayrollBaseCents: 120000,
            },
            {
              id: "item-corr-gen",
              type: "LABOR",
              description: "Alineación corregida",
              quantity: 1,
              unitPriceCents: 80000,
              totalCents: 80000,
              includeInPayroll: false,
              customRatePercent: null,
              customPayrollBaseCents: null,
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
    const worker = report.workers[0];
    expect(worker.totalClientLaborCents).toBe(230000);
    expect(worker.totalPayrollBaseCents).toBe(200000);
    expect(worker.totalCommissionCents).toBe(88000);

    const orderDetail = worker.workOrders[0];
    expect(orderDetail.totalClientLaborCents).toBe(230000);
    expect(orderDetail.totalPayrollBaseCents).toBe(200000);
    expect(orderDetail.totalCommissionCents).toBe(88000);

    const weldedItem = orderDetail.items.find((item) => item.id === "item-corr-weld");
    expect(weldedItem).toBeDefined();
    expect(weldedItem?.description).toBe("Soldadura de escape corregida");
    expect(weldedItem?.category).toBe("WELDING");
    expect(weldedItem?.clientTotalCents).toBe(150000);
    expect(weldedItem?.payrollBaseCents).toBe(120000);
    expect(weldedItem?.commissionCents).toBe(48000);

    const generalItem = orderDetail.items.find((item) => item.id === "item-corr-gen");
    expect(generalItem).toBeDefined();
    expect(generalItem?.description).toBe("Alineación corregida");
    expect(generalItem?.category).toBe("GENERAL");
    expect(generalItem?.clientTotalCents).toBe(80000);
    expect(generalItem?.payrollBaseCents).toBe(80000);
    expect(generalItem?.commissionCents).toBe(40000);
  });
});
