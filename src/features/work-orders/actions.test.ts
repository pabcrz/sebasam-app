import { QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  assignWorker,
  assignWorkOrder,
  createAndAssignWorkOrder,
  completeWorkOrder,
  recordExecution,
  rollbackWorkOrder,
  rollbackWorkOrderAction,
} from "./actions";
import { WorkerUnavailableError } from "./domain";

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/features/quotes/lib/sequence", () => ({ nextWorkOrderNumber: vi.fn().mockResolvedValue("T-0826-01") }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    userProfile: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  workAssignment: { create: vi.fn(), createMany: vi.fn() },
    workOrder: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    executionRecord: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const masterId = "11111111-1111-4111-8111-111111111111";
const helperId = "22222222-2222-4222-8222-222222222222";
const workerId = "33333333-3333-4333-8333-333333333333";

function worker(id: string, workerKind: WorkerKind) {
  return { id, role: UserRole.WORKER, workerKind, isActive: true };
}

type MockTx = {
  quote: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  workOrder: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
  userProfile: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  workAssignment: { createMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  executionRecord: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  payment: { count: ReturnType<typeof vi.fn> };
  ledgerEntry: { count: ReturnType<typeof vi.fn> };
  sharedQuote: { updateMany: ReturnType<typeof vi.fn> };
  paymentRequest: { updateMany: ReturnType<typeof vi.fn> };
  quoteLifecycleEvent: { create: ReturnType<typeof vi.fn> };
};

function createTx(): MockTx {
  const tx = {
    quote: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    workOrder: { create: vi.fn().mockResolvedValue({ id: "wo-new" }), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn() },
    userProfile: { findMany: vi.fn(), findUnique: vi.fn() },
    workAssignment: { createMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    executionRecord: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    payment: { count: vi.fn().mockResolvedValue(0) },
    ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
    sharedQuote: { updateMany: vi.fn() },
    paymentRequest: { updateMany: vi.fn() },
    quoteLifecycleEvent: { create: vi.fn() },
  };
  vi.mocked(prisma.$transaction).mockImplementation(
    // @ts-expect-error Mock
    (callback: (transaction: MockTx) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

describe("work order worker guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({} as never);
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue({ id: workerId } as never);
    vi.mocked(prisma.workAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);
  });

  it("rejects inactive workers for legacy individual assignments", async () => {
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue(null);

    await expect(assignWorker({ workOrderId: "wo-1", workerId })).rejects.toBeInstanceOf(WorkerUnavailableError);
    expect(prisma.workAssignment.create).not.toHaveBeenCalled();
  });

  it("preserves active-worker assignment compatibility", async () => {
    await assignWorker({ workOrderId: "wo-1", workerId });

    expect(prisma.workAssignment.create).toHaveBeenCalledWith({ data: { workOrderId: "wo-1", workerId } });
  });

  it("rejects inactive workers before recording execution", async () => {
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue(null);

    await expect(recordExecution({ workOrderId: "wo-1", workerId, summary: "Cambio de pieza" }))
      .rejects.toBeInstanceOf(WorkerUnavailableError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires an operational role before validating worker assignments", async () => {
    vi.mocked(requireOperationalRole).mockRejectedValue(new Error("Unauthorized"));

    await expect(assignWorker({ workOrderId: "wo-1", workerId })).rejects.toThrow("Unauthorized");
    expect(prisma.userProfile.findFirst).not.toHaveBeenCalled();
  });
});

describe("work order actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({} as never);
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue({ id: workerId } as never);
  });

  describe("createAndAssignWorkOrder", () => {
    it("creates and assigns a regular work order in one step", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue({
        status: QuoteStatus.APPROVED,
        workOrder: null,
        customerId: "customer-1",
        subtotalCents: 1000,
        discountCents: 0,
        taxCents: 160,
        totalCents: 1160,
        taxEnabled: true,
        items: [{ description: "Servicio de taller", quantity: 1, unitPriceCents: 1000 }],
      });
      tx.userProfile.findMany.mockResolvedValue([worker(masterId, WorkerKind.MASTER), worker(helperId, WorkerKind.HELPER)]);

      await createAndAssignWorkOrder("quote-1", {
        isSpecial: false,
        masterId,
        helperIds: [helperId],
      });

      expect(tx.workOrder.create).toHaveBeenCalledWith({
        data: { quoteId: "quote-1", number: "T-0826-01" },
      });
      expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "wo-new" },
        data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED, isSpecial: false, specialAssigneeName: null }),
      }));
      expect(tx.workAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { workOrderId: "wo-new", workerId: masterId, status: "ASSIGNED" },
          { workOrderId: "wo-new", workerId: helperId, status: "ASSIGNED" },
        ],
        skipDuplicates: true,
      });
    });

    it("creates and assigns a special order without validating master/helpers or creating worker assignments", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue({
        status: QuoteStatus.APPROVED,
        workOrder: { id: "wo-existing", status: WorkOrderStatus.PLANNED },
        customerId: "customer-1",
        subtotalCents: 1000,
        discountCents: 0,
        taxCents: 160,
        totalCents: 1160,
        taxEnabled: true,
        items: [{ description: "Servicio de taller", quantity: 1, unitPriceCents: 1000 }],
      });

      await createAndAssignWorkOrder("quote-1", {
        isSpecial: true,
      });

      expect(tx.workOrder.create).not.toHaveBeenCalled();
      expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "wo-existing" },
        data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED, isSpecial: true, specialAssigneeName: null }),
      }));
      expect(tx.workAssignment.createMany).not.toHaveBeenCalled();
    });

    it("rejects assigning if quote is not approved", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.SENT, workOrder: null });

      await expect(createAndAssignWorkOrder("quote-1", {
        isSpecial: true,
      })).rejects.toThrow("aceptada");
    });
  });

  describe("assignWorkOrder", () => {
    it("reassigns special work to Taller without creating worker assignments", async () => {
      const tx = createTx();
      tx.workOrder.findUniqueOrThrow.mockResolvedValue({ id: "wo-1" });
      tx.workOrder.findFirst.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.ASSIGNED, quote: { status: QuoteStatus.APPROVED } });

      await assignWorkOrder({ workOrderId: "wo-1", isSpecial: true });

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: WorkOrderStatus.ASSIGNED, isSpecial: true, specialAssigneeName: null },
      }));
      expect(tx.workAssignment.deleteMany).toHaveBeenCalledWith({ where: { workOrderId: "wo-1" } });
      expect(tx.workAssignment.createMany).not.toHaveBeenCalled();
    });
  });

  describe("completeWorkOrder", () => {
    it("completes an assigned work order", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.ASSIGNED, quote: { status: QuoteStatus.APPROVED } });

      await completeWorkOrder({ workOrderId: "wo-1" });

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "wo-1", status: WorkOrderStatus.ASSIGNED },
        data: expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      }));
      // should set completedAt
      expect(tx.workOrder.updateMany.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
    });

    it("rejects completing an already completed work order", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.COMPLETED, quote: { status: QuoteStatus.APPROVED } });

      await expect(completeWorkOrder({ workOrderId: "wo-1" })).rejects.toThrow("en proceso para poder finalizarse");
    });
  });

  describe("recordExecution", () => {
    it("links execution records to the eligible work order and worker", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.IN_PROGRESS, quote: { status: QuoteStatus.APPROVED } });
      tx.userProfile.findUnique.mockResolvedValue(worker(workerId, WorkerKind.HELPER));

      await recordExecution({
        workOrderId: "wo-1",
        workerId,
        progressPercent: 60,
        isExtra: true,
      });

      expect(tx.executionRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ workOrderId: "wo-1", workerId, summary: "", progressPercent: 60, isExtra: true }),
      });
    });

    it("blocks execution records on cancelled orders", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.CANCELLED, quote: { status: QuoteStatus.APPROVED } });
      tx.userProfile.findUnique.mockResolvedValue(worker(workerId, WorkerKind.HELPER));
      await expect(recordExecution({ workOrderId: "wo-1", workerId, summary: "No debe guardarse" })).rejects.toThrow("no permite");
    });

    it("blocks worker-linked execution records for special Taller work", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({ isSpecial: true, status: WorkOrderStatus.IN_PROGRESS, quote: { status: QuoteStatus.APPROVED } });

      await expect(recordExecution({ workOrderId: "wo-1", workerId, summary: "No debe guardarse" }))
        .rejects.toThrow("Taller no admiten registros de ejecución");
      expect(tx.executionRecord.create).not.toHaveBeenCalled();
    });
  });

  describe("rollbackWorkOrder", () => {
    it("cancels operational records and returns the quote without touching money", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.workOrder.findUnique.mockResolvedValue({
        id: "wo-1",
        quoteId: "quote-1",
        status: WorkOrderStatus.COMPLETED,
        quote: { status: QuoteStatus.APPROVED },
      });

      await rollbackWorkOrder({ workOrderId: "wo-1", targetQuoteStatus: "SENT", reason: "Captura equivocada" });

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: WorkOrderStatus.CANCELLED } }));
      expect(tx.workAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED" } }));
      expect(tx.sharedQuote.updateMany).toHaveBeenCalled();
      expect(tx.paymentRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED" } }));
      expect(tx.quote.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: QuoteStatus.SENT } }));
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorId: workerId, reason: "Captura equivocada" }) }));
    });

    it("blocks the rollback when the quote has payments", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", quoteId: "quote-1", status: WorkOrderStatus.ASSIGNED, quote: { status: QuoteStatus.APPROVED } });
      tx.payment.count.mockResolvedValue(1);

      await expect(rollbackWorkOrder({ workOrderId: "wo-1", targetQuoteStatus: "DRAFT", reason: "Corrección" })).rejects.toThrow("tiene pagos");
      expect(tx.workOrder.updateMany).not.toHaveBeenCalled();
    });

    it("blocks the rollback when the quote has ledger history", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.workOrder.findUnique.mockResolvedValue({ id: "wo-1", quoteId: "quote-1", status: WorkOrderStatus.ASSIGNED, quote: { status: QuoteStatus.APPROVED } });
      tx.ledgerEntry.count.mockResolvedValue(1);

      await expect(rollbackWorkOrder({ workOrderId: "wo-1", targetQuoteStatus: "DRAFT", reason: "Corrección" })).rejects.toThrow("movimientos en el ledger");
      expect(tx.workOrder.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("rollbackWorkOrderAction", () => {
    it("returns known validation and operation errors", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.workOrder.findUnique.mockResolvedValue(null);

      await expect(rollbackWorkOrderAction({ workOrderId: "wo-1", targetQuoteStatus: "SENT", reason: "Corrección" }))
        .resolves.toEqual({ success: false, error: "Orden de trabajo no encontrada." });
      await expect(rollbackWorkOrderAction({ workOrderId: "wo-1", targetQuoteStatus: "SENT", reason: "" }))
        .resolves.toEqual({ success: false, error: "Indica el motivo de la corrección." });
    });

    it("logs unexpected errors and returns a recovery message", async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("database unavailable"));

      await expect(rollbackWorkOrderAction({ workOrderId: "wo-1", targetQuoteStatus: "SENT", reason: "Corrección" }))
        .resolves.toEqual({ success: false, error: "No se pudo corregir la orden. Recarga la página e inténtalo de nuevo." });
      expect(log).toHaveBeenCalledWith("Work order rollback failed", expect.objectContaining({ input: expect.any(Object) }));
      log.mockRestore();
    });
  });
});
