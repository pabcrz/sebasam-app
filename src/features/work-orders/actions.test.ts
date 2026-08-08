import { QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  assignWorker,
  createAndAssignWorkOrder,
  completeWorkOrder,
  recordExecution,
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
  quote: { findUnique: ReturnType<typeof vi.fn> };
  workOrder: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
  userProfile: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  workAssignment: { createMany: ReturnType<typeof vi.fn> };
  executionRecord: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
};

function createTx(): MockTx {
  const tx = {
    quote: { findUnique: vi.fn() },
    workOrder: { create: vi.fn().mockResolvedValue({ id: "wo-new" }), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn() },
    userProfile: { findMany: vi.fn(), findUnique: vi.fn() },
    workAssignment: { createMany: vi.fn() },
    executionRecord: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
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
      tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.APPROVED, workOrder: null });
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
        data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED, isSpecial: false }),
      }));
      expect(tx.workAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { workOrderId: "wo-new", workerId: masterId, status: "ASSIGNED" },
          { workOrderId: "wo-new", workerId: helperId, status: "ASSIGNED" },
        ],
        skipDuplicates: true,
      });
    });

    it("creates and assigns a special order without validating master/helpers", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.APPROVED, workOrder: { id: "wo-existing", status: WorkOrderStatus.PLANNED } });

      await createAndAssignWorkOrder("quote-1", {
        isSpecial: true,
        specialAssigneeName: "Juan Perez (Externo)",
      });

      expect(tx.workOrder.create).not.toHaveBeenCalled();
      expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "wo-existing" },
        data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED, isSpecial: true, specialAssigneeName: "Juan Perez (Externo)" }),
      }));
      expect(tx.workAssignment.createMany).not.toHaveBeenCalled();
    });

    it("rejects assigning if quote is not approved", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.SENT, workOrder: null });

      await expect(createAndAssignWorkOrder("quote-1", {
        isSpecial: true,
        specialAssigneeName: "Juan",
      })).rejects.toThrow("aceptada");
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
  });
});
