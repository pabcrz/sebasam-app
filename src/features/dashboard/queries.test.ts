import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentStatus, QuoteItemType, WorkerKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getOperationalDashboardSnapshot } from "./queries";

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quote: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    workOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
    },
  },
}));

describe("getOperationalDashboardSnapshot", () => {
  const fixedNow = new Date("2026-08-19T14:00:00.000Z"); // Wednesday in CST

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({
      user: { id: "u-1" } as never,
      profile: { id: "u-1", role: "ADMIN" } as never,
    });
  });

  it("enforces requireOperationalRole before executing queries", async () => {
    vi.mocked(requireOperationalRole).mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(getOperationalDashboardSnapshot(fixedNow)).rejects.toThrow("Unauthorized");
    expect(requireOperationalRole).toHaveBeenCalledTimes(1);
    expect(prisma.quote.count).not.toHaveBeenCalled();
  });

  it("returns accurate snapshot with live queues, period KPIs, and payroll estimate", async () => {
    // 1. Mock quote count and workOrder count
    vi.mocked(prisma.quote.count).mockResolvedValueOnce(5); // commercial queue
    vi.mocked(prisma.workOrder.count).mockResolvedValueOnce(3); // active execution

    // 2. Mock payment aggregates (week, month, year)
    vi.mocked(prisma.payment.aggregate)
      .mockResolvedValueOnce({ _count: { _all: 2 }, _sum: { amountCents: 150000 } } as never) // week
      .mockResolvedValueOnce({ _count: { _all: 6 }, _sum: { amountCents: 450000 } } as never) // month
      .mockResolvedValueOnce({ _count: { _all: 20 }, _sum: { amountCents: 1500000 } } as never); // year

    // 3. Mock completed work orders
    const sampleCompletedOrders = [
      {
        id: "wo-1",
        number: "OT-2026-001",
        status: WorkOrderStatus.COMPLETED,
        completedAt: new Date("2026-08-18T16:00:00.000Z"), // Tuesday (this week)
        isSpecial: false,
        specialAssigneeName: null,
        quote: {
          id: "q-1",
          number: "COT-2026-001",
          customer: { name: "Juan Perez" },
          vehicle: { brand: "Ford", model: "Fiesta", year: 2015, plate: "ABC-123" },
          items: [
            {
              id: "item-1",
              type: QuoteItemType.LABOR,
              description: "Alineacion y soldadura",
              quantity: 1,
              unitPriceCents: 100000,
              totalCents: 100000,
            },
            {
              id: "item-2",
              type: QuoteItemType.MATERIAL,
              description: "Bujes y abrazaderas",
              quantity: 2,
              unitPriceCents: 25000,
              totalCents: 50000,
            },
          ],
          sections: [],
        },
        assignments: [
          {
            workerId: "w-1",
            status: AssignmentStatus.DONE,
            worker: {
              id: "w-1",
              displayName: "Pedro Gomez",
              workerKind: WorkerKind.MASTER,
              role: "WORKER",
            },
          },
        ],
      },
    ];

    // 3. Mock pending attention items
    vi.mocked(prisma.quote.findMany).mockResolvedValueOnce([
      {
        id: "q-10",
        status: "DRAFT",
        customer: { name: "Cliente Borrador" },
        vehicle: { brand: "Nissan", model: "Sentra", year: 2020 },
        updatedAt: new Date("2026-08-19T12:00:00.000Z"),
      },
    ] as never);
    vi.mocked(prisma.workOrder.findMany)
      .mockResolvedValueOnce([
        {
          id: "wo-10",
          status: WorkOrderStatus.IN_PROGRESS,
          quote: {
            customer: { name: "Cliente Activo" },
            vehicle: { brand: "Toyota", model: "Corolla", year: 2022 },
          },
          updatedAt: new Date("2026-08-19T13:00:00.000Z"),
        },
      ] as never)
      .mockResolvedValueOnce(sampleCompletedOrders as never);

    const snapshot = await getOperationalDashboardSnapshot(fixedNow);

    // Verify Queues
    expect(snapshot.queues.commercialQueueCount).toBe(5);
    expect(snapshot.queues.activeExecutionCount).toBe(3);

    // Verify Pending Attention
    expect(snapshot.pendingAttention).toHaveLength(2);
    expect(snapshot.pendingAttention[0].customerName).toBe("Cliente Activo");
    expect(snapshot.pendingAttention[0].nextStep).toBe("Finalizar trabajo");
    expect(snapshot.pendingAttention[1].customerName).toBe("Cliente Borrador");
    expect(snapshot.pendingAttention[1].nextStep).toBe("Enviar cotización");

    // Verify Week KPI
    expect(snapshot.kpis.week.completedWorkOrdersCount).toBe(1);
    expect(snapshot.kpis.week.completedLaborBilledCents).toBe(100000);
    expect(snapshot.kpis.week.completedMaterialsBilledCents).toBe(50000);
    expect(snapshot.kpis.week.collectedPaymentsCount).toBe(2);
    expect(snapshot.kpis.week.collectedPaymentsTotalCents).toBe(150000);

    // Verify Month KPI
    expect(snapshot.kpis.month.completedWorkOrdersCount).toBe(1);
    expect(snapshot.kpis.month.completedLaborBilledCents).toBe(100000);
    expect(snapshot.kpis.month.completedMaterialsBilledCents).toBe(50000);
    expect(snapshot.kpis.month.collectedPaymentsCount).toBe(6);
    expect(snapshot.kpis.month.collectedPaymentsTotalCents).toBe(450000);

    // Verify Weekly Payroll Estimate
    expect(snapshot.weeklyPayroll.totalCompletedOrders).toBe(1);
    expect(snapshot.weeklyPayroll.totalWorkers).toBe(1);
    expect(snapshot.weeklyPayroll.estimatedCommissionsCents).toBe(40000); // 40% for soldadura
  });

  it("handles zero-data safely without undefined or NaN values", async () => {
    vi.mocked(prisma.quote.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.workOrder.count).mockResolvedValueOnce(0);

    vi.mocked(prisma.payment.aggregate)
      .mockResolvedValueOnce({ _count: { _all: 0 }, _sum: { amountCents: null } } as never)
      .mockResolvedValueOnce({ _count: { _all: 0 }, _sum: { amountCents: null } } as never)
      .mockResolvedValueOnce({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);

    vi.mocked(prisma.quote.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.workOrder.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const snapshot = await getOperationalDashboardSnapshot(fixedNow);

    expect(snapshot.queues.commercialQueueCount).toBe(0);
    expect(snapshot.queues.activeExecutionCount).toBe(0);
    expect(snapshot.pendingAttention).toEqual([]);
    expect(snapshot.kpis.week.completedWorkOrdersCount).toBe(0);
    expect(snapshot.kpis.week.completedLaborBilledCents).toBe(0);
    expect(snapshot.kpis.week.completedMaterialsBilledCents).toBe(0);
    expect(snapshot.kpis.week.collectedPaymentsCount).toBe(0);
    expect(snapshot.kpis.week.collectedPaymentsTotalCents).toBe(0);
    expect(snapshot.weeklyPayroll.totalWorkers).toBe(0);
    expect(snapshot.weeklyPayroll.estimatedCommissionsCents).toBe(0);
  });
});
