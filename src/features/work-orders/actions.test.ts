import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  assignWorker,
  assignWorkOrder,
  ensureWorkOrderWaiting,
  recordExecution,
  removeExecutionRecord,
  startWorkOrder,
} from "./actions";
import { WorkerUnavailableError } from "./domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    userProfile: { findFirst: vi.fn() },
    workAssignment: { create: vi.fn() },
  },
}));
vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/features/quotes/lib/sequence", () => ({ nextWorkOrderNumber: vi.fn(() => Promise.resolve("T-0826-01")) }));

type MockTx = {
  quote: { findUnique: ReturnType<typeof vi.fn> };
  workOrder: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  userProfile: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  workAssignment: { createMany: ReturnType<typeof vi.fn> };
  executionRecord: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const masterId = "00000000-0000-1000-8000-000000000001";
const helperId = "00000000-0000-1000-8000-000000000002";
const workerId = "00000000-0000-1000-8000-000000000003";

function worker(id: string, workerKind: WorkerKind) {
  return { id, role: UserRole.WORKER, workerKind, isActive: true };
}

function createTx(): MockTx {
  const tx: MockTx = {
    quote: { findUnique: vi.fn() },
    workOrder: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.PLANNED }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "wo-1" }),
    },
    userProfile: { findMany: vi.fn(), findUnique: vi.fn() },
    workAssignment: { createMany: vi.fn() },
    executionRecord: {
      create: vi.fn().mockResolvedValue({ id: "record-1" }),
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: "record-1" }),
    },
  };
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
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

  it("requires an approved quote before creating the waiting work order", async () => {
    const tx = createTx();
    tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.SENT, workOrder: null });

    await expect(ensureWorkOrderWaiting("quote-1")).rejects.toThrow("aceptada");
    expect(tx.workOrder.create).not.toHaveBeenCalled();
  });

  it("creates the waiting work order linked to the approved quote", async () => {
    const tx = createTx();
    tx.quote.findUnique.mockResolvedValue({ status: QuoteStatus.APPROVED, workOrder: null });

    await ensureWorkOrderWaiting("quote-1", { notes: "Ingreso autorizado" });

    expect(tx.workOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quoteId: "quote-1", number: "T-0826-01", notes: "Ingreso autorizado" }),
    });
  });

  it("assigns exactly one master and optional helpers atomically", async () => {
    const tx = createTx();
    tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.PLANNED, quote: { status: QuoteStatus.APPROVED } });
    tx.userProfile.findMany.mockResolvedValue([worker(masterId, WorkerKind.MASTER), worker(helperId, WorkerKind.HELPER)]);

    await assignWorkOrder({
      workOrderId: "wo-1",
      masterId,
      helperIds: [helperId],
      workshopCapacityConfirmed: true,
      masterAvailabilityConfirmed: true,
    });

    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "wo-1", status: WorkOrderStatus.PLANNED },
      data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED }),
    }));
    expect(tx.workAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { workOrderId: "wo-1", workerId: masterId, status: "ASSIGNED" },
        { workOrderId: "wo-1", workerId: helperId, status: "ASSIGNED" },
      ],
    });
  });

  it("rejects missing capacity confirmation and invalid worker roles", async () => {
    const tx = createTx();
    tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.PLANNED, quote: { status: QuoteStatus.APPROVED } });
    tx.userProfile.findMany.mockResolvedValue([worker(masterId, WorkerKind.HELPER)]);

    await expect(assignWorkOrder({
      workOrderId: "wo-1",
      masterId,
      helperIds: [],
      workshopCapacityConfirmed: false,
      masterAvailabilityConfirmed: true,
    })).rejects.toThrow("espacio");

    await expect(assignWorkOrder({
      workOrderId: "wo-1",
      masterId,
      helperIds: [],
      workshopCapacityConfirmed: true,
      masterAvailabilityConfirmed: true,
    })).rejects.toThrow("Maestro");
    expect(tx.workOrder.updateMany).not.toHaveBeenCalled();
  });

  it("starts only an assigned order after both confirmations", async () => {
    const tx = createTx();
    tx.workOrder.findUnique.mockResolvedValue({
      status: WorkOrderStatus.ASSIGNED,
      quote: { status: QuoteStatus.APPROVED },
      assignments: [{ status: "ASSIGNED", worker: worker(masterId, WorkerKind.MASTER) }],
    });

    await startWorkOrder({ workOrderId: "wo-1", workshopCapacityConfirmed: true, masterAvailabilityConfirmed: true });

    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "wo-1", status: WorkOrderStatus.ASSIGNED },
      data: expect.objectContaining({ status: WorkOrderStatus.IN_PROGRESS }),
    }));
  });

  it("links execution records to the eligible work order and worker", async () => {
    const tx = createTx();
    tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.IN_PROGRESS, quote: { status: QuoteStatus.APPROVED } });
    tx.userProfile.findUnique.mockResolvedValue(worker(workerId, WorkerKind.HELPER));

    await recordExecution({
      workOrderId: "wo-1",
      workerId,
      summary: "Se instaló el refuerzo",
      notes: "Se verificó torque",
      progressPercent: 60,
      isExtra: true,
    });

    expect(tx.executionRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workOrderId: "wo-1", workerId, progressPercent: 60, isExtra: true }),
    });
  });

  it("blocks execution records on cancelled orders and removes only extras", async () => {
    const tx = createTx();
    tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.CANCELLED, quote: { status: QuoteStatus.APPROVED } });
    await expect(recordExecution({ workOrderId: "wo-1", workerId, summary: "No debe guardarse" })).rejects.toThrow("no permite");

    tx.executionRecord.findUnique.mockResolvedValue({ isExtra: false, workOrder: { status: WorkOrderStatus.IN_PROGRESS } });
    await expect(removeExecutionRecord("record-1")).rejects.toThrow("adicionales");

    tx.executionRecord.findUnique.mockResolvedValue({ isExtra: true, workOrder: { status: WorkOrderStatus.IN_PROGRESS } });
    await removeExecutionRecord("record-1");
    expect(tx.executionRecord.delete).toHaveBeenCalledWith({ where: { id: "record-1" } });
  });

  it("requires the existing operational auth guard", async () => {
    vi.mocked(requireOperationalRole).mockRejectedValue(new Error("unauthorized"));

    await expect(ensureWorkOrderWaiting("quote-1")).rejects.toThrow("unauthorized");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
