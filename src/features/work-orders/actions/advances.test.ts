import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentStatus, PayrollPeriodStatus, QuoteItemType, WorkerKind, WorkOrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  deleteLaborAdvanceAction,
  getWorkOrderLaborAdvancesSummary,
  recordLaborAdvanceAction,
} from "./advances";
import {
  closePayrollWeekAction,
  getPayrollWeekStatus,
  reopenPayrollWeekAction,
} from "@/features/payroll/week-control";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    $queryRaw: vi.fn().mockResolvedValue([{ id: "item-1", status: PayrollPeriodStatus.OPEN }]),
    workOrder: {
      findUnique: vi.fn(),
    },
    quoteItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workOrderLaborAdvance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    payrollWeekControl: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Labor Advance Actions", () => {
  const mockUser = {
    user: { id: "user-auth-id" },
    profile: { id: "user-profile-id", displayName: "Supervisor" },
  };

  const currentMonday = "2026-09-14"; // matches current test week anchor

  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "item-1", status: PayrollPeriodStatus.OPEN },
    ]);
  });

  describe("Week status and controls", () => {
    it("treats current week as OPEN by default when no control record exists", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const status = await getPayrollWeekStatus(currentMonday, new Date(`${currentMonday}T12:00:00.000Z`));
      expect(status).toBe(PayrollPeriodStatus.OPEN);
    });

    it("treats past week as CLOSED by default when no control record exists", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const status = await getPayrollWeekStatus("2026-08-31", new Date(`${currentMonday}T12:00:00.000Z`));
      expect(status).toBe(PayrollPeriodStatus.CLOSED);
    });

    it("reopens a closed week with valid supervisor reason and audit", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.CLOSED },
      ]);

      const result = await reopenPayrollWeekAction({
        weekStart: "2026-08-31",
        reason: "Corrección autorizada por gerencia",
      });

      expect(result).toEqual({ success: true });
      expect(prisma.payrollWeekControl.update).toHaveBeenCalledWith({
        where: { weekStart: new Date("2026-08-31T00:00:00.000Z") },
        data: expect.objectContaining({
          status: PayrollPeriodStatus.OPEN,
          reopenedById: "user-profile-id",
          reopenReason: "Corrección autorizada por gerencia",
        }),
      });
    });

    it("rejects reopening if reason is too short", async () => {
      const result = await reopenPayrollWeekAction({
        weekStart: "2026-08-31",
        reason: "no",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("mínimo 5 caracteres");
      expect(prisma.payrollWeekControl.update).not.toHaveBeenCalled();
    });

    it("rejects reopening if week status is PAID or ARCHIVED", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.PAID },
      ]);

      const result = await reopenPayrollWeekAction({
        weekStart: "2026-08-31",
        reason: "Corrección autorizada por gerencia",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("PAGADA");
      expect(prisma.payrollWeekControl.update).not.toHaveBeenCalled();
    });

    it("is idempotent when reopening an already OPEN week", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.OPEN },
      ]);

      const result = await reopenPayrollWeekAction({
        weekStart: currentMonday,
        reason: "Reabrir semana abierta",
      });

      expect(result).toEqual({ success: true });
      expect(prisma.payrollWeekControl.update).not.toHaveBeenCalled();
    });

    it("closes an open week with audit", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.OPEN },
      ]);

      const result = await closePayrollWeekAction({
        weekStart: currentMonday,
      });

      expect(result).toEqual({ success: true });
      expect(prisma.payrollWeekControl.update).toHaveBeenCalledWith({
        where: { weekStart: new Date(`${currentMonday}T00:00:00.000Z`) },
        data: expect.objectContaining({
          status: PayrollPeriodStatus.CLOSED,
          closedById: "user-profile-id",
        }),
      });
    });

    it("rejects closing if week status is PAID or ARCHIVED", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.PAID },
      ]);

      const result = await closePayrollWeekAction({
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("PAGADA");
      expect(prisma.payrollWeekControl.update).not.toHaveBeenCalled();
    });

    it("is idempotent when closing an already CLOSED week", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.CLOSED },
      ]);

      const result = await closePayrollWeekAction({
        weekStart: "2026-08-31",
      });

      expect(result).toEqual({ success: true });
      expect(prisma.payrollWeekControl.update).not.toHaveBeenCalled();
    });
  });

  describe("recordLaborAdvanceAction", () => {
    const validWorkOrder = {
      id: "wo-1",
      isSpecial: false,
      status: WorkOrderStatus.ASSIGNED,
      quote: { id: "quote-1" },
      assignments: [
        {
          workerId: "master-id",
          status: AssignmentStatus.ASSIGNED,
          worker: {
            id: "master-id",
            workerKind: WorkerKind.MASTER,
            displayName: "Maestro Pedro",
          },
        },
      ],
    };

    const validQuoteItem = {
      id: "item-1",
      quoteId: "quote-1",
      type: QuoteItemType.LABOR,
      description: "Acorazado de chasis",
      totalCents: 10_000_00,
      customPayrollBaseCents: null,
      customRatePercent: 50,
      payrollConfigLockedAt: null,
    };

    it("records a labor advance on an open week and freezes quote item config", async () => {
      // Week is open (null control for current week)
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validWorkOrder);
      (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validQuoteItem);
      (prisma.workOrderLaborAdvance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrderLaborAdvance.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.workOrderLaborAdvance.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-adv-1" });

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 4_000_00,
        weekStart: currentMonday,
        notes: "Avance lado izquierdo",
      });

      expect(result).toEqual({ success: true, advanceId: "new-adv-1" });

      // Expect snapshot creation
      expect(prisma.workOrderLaborAdvance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: "wo-1",
          quoteItemId: "item-1",
          workerId: "master-id",
          advanceBaseCents: 4_000_00,
          advancePercentage: 40,
          commissionRatePercent: 50,
          commissionCents: 2_000_00,
          notes: "Avance lado izquierdo",
          createdById: "user-profile-id",
        }),
      });

      // Expect quote item configuration lock
      expect(prisma.quoteItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { payrollConfigLockedAt: expect.any(Date) },
      });

      expect(revalidatePath).toHaveBeenCalledWith("/admin/nomina");
    });

    it("rejects advance if week is closed", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.CLOSED },
      ]);

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 2_000_00,
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cerrada");
      expect(prisma.workOrderLaborAdvance.create).not.toHaveBeenCalled();
    });

    it("rejects advance with non-positive or decimal amounts", async () => {
      const zeroResult = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 0,
        weekStart: currentMonday,
      });
      expect(zeroResult.success).toBe(false);

      const decimalResult = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 1500.5,
        weekStart: currentMonday,
      });
      expect(decimalResult.success).toBe(false);
    });

    it("rejects advance on special work orders", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...validWorkOrder,
        isSpecial: true,
      });

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 2_000_00,
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("especiales");
    });

    it("rejects advance on completed work orders", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...validWorkOrder,
        status: WorkOrderStatus.COMPLETED,
      });

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 2_000_00,
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("activas");
    });

    it("rejects advance if order has no assigned master", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...validWorkOrder,
        assignments: [],
      });

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 2_000_00,
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("maestro asignado");
    });

    it("rejects second advance on the same concept within the same week", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validWorkOrder);
      (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validQuoteItem);
      (prisma.workOrderLaborAdvance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "existing-adv",
      });

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 2_000_00,
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ya existe un avance registrado para este concepto en esta semana");
    });

    it("rejects advance that exceeds the remaining available base", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validWorkOrder);
      (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validQuoteItem);
      (prisma.workOrderLaborAdvance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      // Already $8,000 advanced out of $10,000 -> only $2,000 remains
      (prisma.workOrderLaborAdvance.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { advanceBaseCents: 8_000_00 },
      ]);

      const result = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 3_000_00, // Exceeds remaining $2,000
        weekStart: currentMonday,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("excede la base pendiente disponible");
      expect(prisma.workOrderLaborAdvance.create).not.toHaveBeenCalled();
    });

    it("prevents concurrent calls from exceeding remaining balance", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validWorkOrder);
      (prisma.quoteItem.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validQuoteItem);
      (prisma.workOrderLaborAdvance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Simulating shared state across sequential execution in transaction lock:
      // Total is $10,000, initial advances is $5,000 (remaining: $5,000).
      const currentAdvances = [{ advanceBaseCents: 5_000_00 }];
      (prisma.workOrderLaborAdvance.findMany as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve([...currentAdvances])
      );
      (prisma.workOrderLaborAdvance.create as ReturnType<typeof vi.fn>).mockImplementation(
        ({ data }) => {
          currentAdvances.push({ advanceBaseCents: data.advanceBaseCents });
          return Promise.resolve({ id: `adv-${currentAdvances.length}` });
        }
      );

      // Call 1: advances $3,000 (leaves $2,000)
      const res1 = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 3_000_00,
        weekStart: currentMonday,
      });
      expect(res1.success).toBe(true);

      // Call 2: tries to advance $3,000 again, but only $2,000 is left!
      const res2 = await recordLaborAdvanceAction({
        workOrderId: "wo-1",
        quoteItemId: "item-1",
        advanceBaseCents: 3_000_00,
        weekStart: currentMonday,
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain("excede la base pendiente disponible");
    });
  });

  describe("deleteLaborAdvanceAction", () => {
    it("deletes an advance on an open week and unfreezes config when no advances remain", async () => {
      (prisma.payrollWeekControl.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.workOrderLaborAdvance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "adv-1",
        weekStart: new Date(`${currentMonday}T00:00:00.000Z`),
        quoteItemId: "item-1",
        workOrderId: "wo-1",
      });
      (prisma.workOrderLaborAdvance.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await deleteLaborAdvanceAction({ advanceId: "adv-1" });

      expect(result).toEqual({ success: true });
      expect(prisma.workOrderLaborAdvance.delete).toHaveBeenCalledWith({ where: { id: "adv-1" } });
      // Because count is 0, config lock is cleared
      expect(prisma.quoteItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { payrollConfigLockedAt: null },
      });
    });

    it("rejects deletion if week is closed", async () => {
      (prisma.workOrderLaborAdvance.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "adv-1",
        weekStart: new Date("2026-08-31T00:00:00.000Z"),
        quoteItemId: "item-1",
        workOrderId: "wo-1",
      });
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "ctrl-1", status: PayrollPeriodStatus.CLOSED },
      ]);

      const result = await deleteLaborAdvanceAction({ advanceId: "adv-1" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cerrada");
      expect(prisma.workOrderLaborAdvance.delete).not.toHaveBeenCalled();
    });
  });

  describe("getWorkOrderLaborAdvancesSummary", () => {
    it("requires operational role and returns calculated summary", async () => {
      (prisma.workOrder.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "wo-1",
        isSpecial: false,
        assignments: [
          {
            status: AssignmentStatus.ASSIGNED,
            worker: { id: "master-1", displayName: "Maestro Juan", workerKind: WorkerKind.MASTER },
          },
        ],
        quote: {
          items: [
            {
              id: "item-1",
              type: QuoteItemType.LABOR,
              description: "Mano de obra 1",
              totalCents: 5_000_00,
              customPayrollBaseCents: null,
              customRatePercent: 50,
              payrollConfigLockedAt: null,
            },
          ],
          sections: [],
        },
        laborAdvances: [],
      });

      const summary = await getWorkOrderLaborAdvancesSummary("wo-1", currentMonday);

      expect(requireOperationalRole).toHaveBeenCalled();
      expect(summary).not.toBeNull();
      expect(summary?.workOrderId).toBe("wo-1");
      expect(summary?.masterWorker?.id).toBe("master-1");
      expect(summary?.concepts).toHaveLength(1);
      expect(summary?.concepts[0].remainingBaseCents).toBe(5_000_00);
    });
  });
});
