import { AssignmentStatus, Prisma, QuoteDecisionOrigin, QuoteLifecycleEventType, QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  assignWorker,
  assignWorkOrder,
  convertQuoteToNoteAction,
  createWorkOrder,
  createAndAssignWorkOrder,
  completeWorkOrder,
  createDirectNote,
  createDirectNoteFromWorkspace,
  createDirectWorkOrder,
  createDirectWorkOrderFromWorkspace,
  recordExecution,
  returnNoteToQuoteAction,
  rollbackWorkOrder,
  rollbackWorkOrderAction,
} from "./actions";
import { WorkerUnavailableError } from "./domain";

const { after, ineligibleCompletedWorkKnowledge, prepareCompletedWorkKnowledge, synchronizeCompletedWorkKnowledge } = vi.hoisted(() => ({
  after: vi.fn(),
  ineligibleCompletedWorkKnowledge: vi.fn(),
  prepareCompletedWorkKnowledge: vi.fn(),
  synchronizeCompletedWorkKnowledge: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after }));
vi.mock("@/features/completed-work-knowledge/service", () => ({
  ineligibleCompletedWorkKnowledge,
  prepareCompletedWorkKnowledge,
  synchronizeCompletedWorkKnowledge,
}));
vi.mock("@/features/quotes/lib/sequence", () => ({
  nextQuoteNumber: vi.fn().mockResolvedValue("COT-0826-01"),
  nextWorkOrderNumber: vi.fn().mockResolvedValue("T-0826-01"),
  withQuoteNumberRetry: vi.fn().mockImplementation((fn: () => unknown) => fn()),
}));
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

function operationalQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-1",
    status: QuoteStatus.APPROVED,
    customerId: "customer-1",
    vehicle: null,
    vehicleSnapshot: null,
    subtotalCents: 10_000,
    discountCents: 0,
    taxCents: 1_600,
    totalCents: 11_600,
    taxEnabled: true,
    items: [],
    sections: [{ items: [{ type: "LABOR", description: "Service", quantity: 1, unitPriceCents: 10_000 }] }],
    workOrder: null,
    ...overrides,
  };
}

type MockTx = {
  $queryRaw: ReturnType<typeof vi.fn>;
  quote: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  quoteItem: { createMany: ReturnType<typeof vi.fn> };
  quoteDecision: { create: ReturnType<typeof vi.fn> };
  quoteLifecycleEvent: { create: ReturnType<typeof vi.fn> };
  workOrder: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
  userProfile: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  workAssignment: { create: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  executionRecord: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  payment: { count: ReturnType<typeof vi.fn> };
  ledgerEntry: { count: ReturnType<typeof vi.fn> };
  sharedQuote: {
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  paymentRequest: { updateMany: ReturnType<typeof vi.fn> };
  payableNote: { create: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> };
  completedWorkKnowledgeSource: { updateMany: ReturnType<typeof vi.fn> };
  vehicle: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  customer: { findUnique: ReturnType<typeof vi.fn> };
  customerContact: { findUnique: ReturnType<typeof vi.fn> };
};

function createTx(): MockTx {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 1 }]),
    quote: {
      create: vi.fn().mockResolvedValue({ id: "quote-new", sections: [{ id: "sec-1", sortOrder: 0 }] }),
      findUnique: vi.fn().mockResolvedValue({ id: "quote-new", number: "0926-001" }),
      update: vi.fn().mockResolvedValue({ id: "quote-new" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    quoteItem: { createMany: vi.fn() },
    quoteDecision: { create: vi.fn() },
    quoteLifecycleEvent: { create: vi.fn() },
    workOrder: { create: vi.fn().mockResolvedValue({ id: "wo-new" }), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn() },
    userProfile: { findFirst: vi.fn().mockResolvedValue(worker(masterId, WorkerKind.MASTER)), findMany: vi.fn(), findUnique: vi.fn() },
    workAssignment: { create: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    executionRecord: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    payment: { count: vi.fn().mockResolvedValue(0) },
    ledgerEntry: { count: vi.fn().mockResolvedValue(0) },
    sharedQuote: {
      create: vi.fn().mockResolvedValue({ id: "sq-1", token: "tok-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    paymentRequest: { updateMany: vi.fn() },
    payableNote: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id, ...data })),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    completedWorkKnowledgeSource: { updateMany: vi.fn() },
    vehicle: { findFirst: vi.fn().mockResolvedValue({ id: "veh-1" }), create: vi.fn(), update: vi.fn().mockResolvedValue({ id: "veh-1" }) },
    customer: { findUnique: vi.fn().mockResolvedValue(null) },
    customerContact: { findUnique: vi.fn().mockResolvedValue(null) },
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
    vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue({ id: workerId } as never);
    vi.mocked(after).mockImplementation(() => undefined);
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
    vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
    vi.mocked(prisma.userProfile.findFirst).mockResolvedValue({ id: workerId } as never);
  });

  describe("createAndAssignWorkOrder", () => {
    it("creates and assigns a regular work order in one step", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue(operationalQuote());
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
      expect(tx.quote.updateMany).not.toHaveBeenCalled();
      expect(tx.sharedQuote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ quoteId: "quote-1" }),
      }));
      expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
    });

    it.each([QuoteStatus.DRAFT, QuoteStatus.SENT])("promotes a %s quote and creates its public link", async (quoteStatus) => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue(operationalQuote({
        status: quoteStatus,
        customerId: null,
        vehicleSnapshot: { plate: "ABC-123" },
        subtotalCents: null,
        taxCents: null,
        totalCents: null,
        sections: [{ items: [{ type: "LABOR", description: "Diagnosis", quantity: 1, unitPriceCents: null }] }],
      }));

      await createAndAssignWorkOrder("quote-1", { isSpecial: true });

      expect(tx.workOrder.create).toHaveBeenCalled();
      expect(tx.workOrder.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED }),
      }));
      expect(tx.quote.updateMany).toHaveBeenCalledWith({
        where: { id: "quote-1", status: quoteStatus },
        data: { status: QuoteStatus.APPROVED, approvedAt: expect.any(Date) },
      });
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ previousState: quoteStatus, nextState: QuoteStatus.APPROVED }),
      }));
      expect(tx.sharedQuote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ quoteId: "quote-1" }),
      }));
      expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
    });

    it("rejects a draft without a customer or identifiable unit", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue(operationalQuote({
        status: QuoteStatus.DRAFT,
        customerId: null,
        vehicleSnapshot: null,
      }));

      await expect(createAndAssignWorkOrder("quote-1", { isSpecial: true })).rejects.toThrow(/cliente o identifica la unidad/i);
      expect(tx.workOrder.create).not.toHaveBeenCalled();
    });

    it("creates and assigns a special order without validating master/helpers or creating worker assignments", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue(operationalQuote({ workOrder: { id: "wo-existing", status: WorkOrderStatus.PLANNED } }));

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

    it("rejects assigning if quote is outside an internal operational state", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue(operationalQuote({ status: QuoteStatus.REJECTED }));

      await expect(createAndAssignWorkOrder("quote-1", {
        isSpecial: true,
      })).rejects.toThrow(/borrador, enviada o aceptada/i);
    });
  });

  describe("createWorkOrder", () => {
    it("promotes a draft quote and creates its public link in the planning transaction", async () => {
      const tx = createTx();
      tx.quote.findUnique.mockResolvedValue(operationalQuote({ status: QuoteStatus.DRAFT }));

      await createWorkOrder({ quoteId: "quote-1" });

      expect(tx.quote.updateMany).toHaveBeenCalledWith({
        where: { id: "quote-1", status: QuoteStatus.DRAFT },
        data: { status: QuoteStatus.APPROVED, approvedAt: expect.any(Date) },
      });
      expect(tx.sharedQuote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ quoteId: "quote-1" }),
      }));
    });
  });

  describe("assignWorkOrder", () => {
    it("reassigns special work to Taller without creating worker assignments", async () => {
      const tx = createTx();
      tx.workOrder.findUniqueOrThrow.mockResolvedValue({ id: "wo-1" });
      tx.workOrder.findFirst.mockResolvedValue({ id: "wo-1", status: WorkOrderStatus.ASSIGNED, quote: operationalQuote() });

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
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.ASSIGNED, quote: operationalQuote() });

      await completeWorkOrder({ workOrderId: "wo-1" });

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "wo-1", status: WorkOrderStatus.ASSIGNED },
        data: expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      }));
      // should set completedAt and paymentDueDate
      expect(tx.workOrder.updateMany.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
      expect(tx.workOrder.updateMany.mock.calls[0][0].data.paymentDueDate).toBeInstanceOf(Date);
      expect(tx.payableNote.updateMany).toHaveBeenCalledWith({
        where: { workOrderId: "wo-1", status: "DRAFT" },
        data: expect.objectContaining({ status: "ISSUED", issuedAt: expect.any(Date) }),
      });
      expect(tx.workAssignment.updateMany).toHaveBeenCalledWith({
        where: {
          workOrderId: "wo-1",
          status: { notIn: [AssignmentStatus.DONE, AssignmentStatus.CANCELLED] },
        },
        data: { status: AssignmentStatus.DONE },
      });
      expect(prepareCompletedWorkKnowledge).toHaveBeenCalledWith("wo-1");
      expect(after).toHaveBeenCalledOnce();
      expect(synchronizeCompletedWorkKnowledge).not.toHaveBeenCalled();
    });

    it("completes a priced draft identified by unit without requiring a customer", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({
        status: WorkOrderStatus.ASSIGNED,
        quote: operationalQuote({ status: QuoteStatus.DRAFT, customerId: null, vehicleSnapshot: { plate: "ABC-123" } }),
      });

      await completeWorkOrder({ workOrderId: "wo-1" });

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      }));
    });

    it("blocks completion while a concept price is pending", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({
        status: WorkOrderStatus.ASSIGNED,
        quote: operationalQuote({
          status: QuoteStatus.SENT,
          subtotalCents: null,
          taxCents: null,
          totalCents: null,
          sections: [{ items: [{ type: "LABOR", description: "Diagnosis", quantity: 1, unitPriceCents: null }] }],
        }),
      });

      await expect(completeWorkOrder({ workOrderId: "wo-1" })).rejects.toThrow(/precios válidos/i);
      expect(tx.workOrder.updateMany).not.toHaveBeenCalled();
    });

    it("rejects completing an already completed work order", async () => {
      const tx = createTx();
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.COMPLETED, quote: operationalQuote() });

      await expect(completeWorkOrder({ workOrderId: "wo-1" })).rejects.toThrow("en proceso para poder finalizarse");
    });

    it("preserves completion when deferred semantic indexing fails", async () => {
      const tx = createTx();
      const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
      tx.workOrder.findUnique.mockResolvedValue({ status: WorkOrderStatus.ASSIGNED, quote: operationalQuote() });
      vi.mocked(synchronizeCompletedWorkKnowledge).mockRejectedValueOnce(new Error("Gemini unavailable"));

      await expect(completeWorkOrder({ workOrderId: "wo-1" })).resolves.toBeUndefined();

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: WorkOrderStatus.COMPLETED }),
      }));
      expect(synchronizeCompletedWorkKnowledge).not.toHaveBeenCalled();
      await vi.mocked(after).mock.calls[0]![0]();
      expect(log).toHaveBeenCalledWith("Completed work knowledge synchronization failed", expect.objectContaining({
        workOrderId: "wo-1",
      }));
      log.mockRestore();
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
    it.each([QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED])("cancels a %s quote without financial activity", async (quoteStatus) => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.workOrder.findUnique.mockResolvedValue({
        id: "wo-1",
        quoteId: "quote-1",
        status: WorkOrderStatus.COMPLETED,
        quote: { status: quoteStatus },
      });

      await rollbackWorkOrder({ workOrderId: "wo-1", targetQuoteStatus: "SENT", reason: "Captura equivocada" });

      expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: WorkOrderStatus.CANCELLED } }));
      expect(tx.workAssignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED" } }));
      expect(tx.sharedQuote.updateMany).not.toHaveBeenCalled();
      expect(tx.paymentRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED" } }));
      expect(tx.quote.updateMany).toHaveBeenCalledWith({
        where: { id: "quote-1", status: quoteStatus },
        data: { status: QuoteStatus.SENT },
      });
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ previousState: quoteStatus, actorId: workerId, reason: "Captura equivocada" }),
      }));
      expect(ineligibleCompletedWorkKnowledge).toHaveBeenCalledWith("wo-1", tx);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    it("returns a work order to draft and revokes its active public link", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.workOrder.findUnique.mockResolvedValue({
        id: "wo-1",
        quoteId: "quote-1",
        status: WorkOrderStatus.ASSIGNED,
        quote: { status: QuoteStatus.APPROVED },
      });

      await rollbackWorkOrder({ workOrderId: "wo-1", targetQuoteStatus: QuoteStatus.DRAFT, reason: "Regresar a cotización" });

      expect(tx.quote.updateMany).toHaveBeenCalledWith({
        where: { id: "quote-1", status: QuoteStatus.APPROVED },
        data: { status: QuoteStatus.DRAFT },
      });
      expect(tx.sharedQuote.updateMany).toHaveBeenCalledWith({
        where: { quoteId: "quote-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
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

    it("returns a specific recovery error for a serializable transaction conflict", async () => {
      vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "test",
      }));

      await expect(rollbackWorkOrderAction({ workOrderId: "wo-1", targetQuoteStatus: "SENT", reason: "Corrección" }))
        .resolves.toEqual({ success: false, error: "La operación cambió mientras se corregía. Recarga e inténtalo de nuevo." });
    });
  });

  describe("createDirectWorkOrder", () => {
    const validDirectInput = {
      customerId: "customer-1",
      vehicle: { plate: "ABC-123", brand: "Toyota", model: "Corolla", year: 2020 },
      title: "Direct Work Order",
      description: "Direct creation",
      administrative: false,
      taxEnabled: true,
      discountCents: 0,
      operationalDate: "2026-08-31",
      masterId,
      isCompleted: false,
      sections: [
        {
          name: "General",
          isAuthorized: false,
          items: [
            {
              type: "LABOR" as const,
              description: "Brake repair",
              quantity: 1,
              unitPriceCents: 15_000,
              includeInPayroll: true,
            },
          ],
        },
      ],
    };

    it("creates an open direct work order with ASSIGNED status and assigns the master", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      const result = await createDirectWorkOrder(validDirectInput);

      expect(tx.quote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: QuoteStatus.APPROVED,
          customerId: "customer-1",
          operationalDate: new Date("2026-08-31T00:00:00.000Z"),
        }),
      }));
      expect(tx.quoteDecision.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: QuoteStatus.APPROVED,
          origin: QuoteDecisionOrigin.ADMIN,
          actorId: workerId,
          note: "Trabajo creado directamente",
        }),
      }));
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          previousState: QuoteStatus.DRAFT,
          nextState: QuoteStatus.APPROVED,
          actorId: workerId,
          reason: "Trabajo creado directamente",
        }),
      }));
      expect(tx.workOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: WorkOrderStatus.ASSIGNED,
          completedAt: null,
        }),
      }));
      expect(tx.workAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          workerId: masterId,
          status: AssignmentStatus.ASSIGNED,
        }),
      }));
      expect(tx.sharedQuote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ quoteId: "quote-new" }),
      }));
      expect(result).toHaveProperty("quote");
      expect(result).toHaveProperty("workOrder");
    });

    it("persists customerContactId, customerFiscalProfileId, and snapshots when provided", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      tx.customer.findUnique.mockResolvedValue({
        id: "customer-1",
        name: "Transportes Del Norte",
        commercialName: "TDN",
        legalName: "TDN SA de CV",
        email: "tdn@example.com",
        phone: "555-1234",
        address: "Av Central 1",
        fiscalProfiles: [
          {
            id: "fiscal-1",
            businessName: "TDN SA de CV",
            taxId: "TDN123456789",
          },
        ],
      });

      tx.customerContact.findUnique.mockResolvedValue({
        id: "contact-1",
        name: "Juan Perez",
        phone: "555-9999",
        role: "Chofer",
      });

      await createDirectWorkOrder({
        ...validDirectInput,
        customerContactId: "contact-1",
        customerFiscalProfileId: "fiscal-1",
      });

      expect(tx.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerContactId: "contact-1",
            customerFiscalProfileId: "fiscal-1",
            customerSnapshot: expect.objectContaining({
              customerId: "customer-1",
              name: "Transportes Del Norte",
              commercialName: "TDN",
              legalName: "TDN SA de CV",
              taxId: "TDN123456789",
            }),
            contactSnapshot: {
              id: "contact-1",
              name: "Juan Perez",
              phone: "555-9999",
              role: "Chofer",
            },
          }),
        }),
      );
    });

    it("allows open direct work order creation with pending prices", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      const inputWithPendingPrice = {
        ...validDirectInput,
        sections: [
          {
            name: "General",
            isAuthorized: false,
            items: [
              {
                type: "LABOR" as const,
                description: "Diagnosis",
                quantity: 1,
                unitPriceCents: undefined,
              },
            ],
          },
        ],
      };

      await expect(createDirectWorkOrder(inputWithPendingPrice)).resolves.toBeDefined();
      expect(tx.workOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: WorkOrderStatus.ASSIGNED, completedAt: null }),
      }));
    });

    it("creates a completed direct work order with COMPLETED status and DONE assignment", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      await createDirectWorkOrder({
        ...validDirectInput,
        isCompleted: true,
      });

      expect(tx.workOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: WorkOrderStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      }));
      expect(tx.workAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          workerId: masterId,
          status: AssignmentStatus.DONE,
        }),
      }));
      expect(prepareCompletedWorkKnowledge).toHaveBeenCalledWith("wo-new");
      expect(after).toHaveBeenCalledOnce();
      expect(synchronizeCompletedWorkKnowledge).not.toHaveBeenCalled();
    });

    it("sets completedAt to local noon in America/Mexico_City for retroactive completed work", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      await createDirectWorkOrder({
        ...validDirectInput,
        operationalDate: "2026-08-31",
        isCompleted: true,
      });

      const completedAt = tx.workOrder.create.mock.calls[0][0].data.completedAt as Date;
      expect(completedAt).toEqual(new Date("2026-08-31T18:00:00.000Z"));
    });

    it("rejects completed direct work order when concept prices are missing", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      const inputMissingPrice = {
        ...validDirectInput,
        isCompleted: true,
        sections: [
          {
            name: "General",
            isAuthorized: false,
            items: [
              {
                type: "LABOR" as const,
                description: "Brake repair",
                quantity: 1,
                unitPriceCents: undefined,
              },
            ],
          },
        ],
      };

      await expect(createDirectWorkOrder(inputMissingPrice)).rejects.toThrow(/precios válidos/i);
      expect(tx.workOrder.create).not.toHaveBeenCalled();
    });

    it("rejects creation when master is not found or inactive", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.userProfile.findFirst.mockResolvedValue(null);

      await expect(createDirectWorkOrder(validDirectInput)).rejects.toThrow(/maestro responsable/i);
    });

    it("rejects future operational dates", async () => {
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      await expect(createDirectWorkOrder({
        ...validDirectInput,
        operationalDate: "2099-01-01",
      })).rejects.toThrow(/today or earlier|future/i);
    });
  });

  describe("createDirectWorkOrderFromWorkspace", () => {
    it("revalidates quotes, work-orders, and notas on success", async () => {
      createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      const formData = new FormData();
      formData.set("customerId", "customer-1");
      formData.set("masterId", masterId);
      formData.set("title", "Direct Work Order");
      formData.set("operationalDate", "2026-08-31");
      formData.set("sections.0.name", "General");
      formData.set("sections.0.items.0.type", "LABOR");
      formData.set("sections.0.items.0.description", "Service");
      formData.set("sections.0.items.0.quantity", "1");
      formData.set("sections.0.items.0.unitPrice", "10000");

      const result = await createDirectWorkOrderFromWorkspace({}, formData);

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/work-orders");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/notas");
    });

    it("returns validation error when master is missing", async () => {
      const formData = new FormData();
      formData.set("customerId", "customer-1");
      formData.set("title", "Direct Work Order");
      formData.set("sections.0.name", "General");
      formData.set("sections.0.items.0.type", "LABOR");
      formData.set("sections.0.items.0.description", "Service");
      formData.set("sections.0.items.0.quantity", "1");

      const result = await createDirectWorkOrderFromWorkspace({}, formData);

      expect(result.error).toMatch(/maestro responsable/i);
    });
  });

  describe("document lifecycle: createDirectNote and convertQuoteToNote", () => {
    it("creates a direct note with COMPLETED work order, paymentDueDate, and CONVERT_TO_NOTE event", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      const dueDate = new Date("2026-09-30T00:00:00.000Z");
      await createDirectNote({
        customerId: "customer-1",
        vehicle: { plate: "ABC-123", brand: "Toyota", model: "Corolla", year: 2020 },
        title: "Direct Note",
        description: "Direct creation",
        administrative: false,
        taxEnabled: true,
        discountCents: 0,
        operationalDate: "2026-08-31",
        masterId,
        sections: [
          {
            name: "General",
            items: [
              {
                type: "LABOR" as const,
                description: "Brake repair",
                quantity: 1,
                unitPriceCents: 10000,
              },
            ],
          },
        ],
        paymentDueDate: dueDate,
      });

      expect(tx.quote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: QuoteStatus.APPROVED,
          paymentDueDate: dueDate,
        }),
      }));
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          eventType: QuoteLifecycleEventType.CONVERT_TO_NOTE,
          reason: "Nota creada directamente",
        }),
      }));
      expect(tx.workOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: WorkOrderStatus.COMPLETED,
        }),
      }));
      expect(tx.payableNote.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          id: "wo-new",
          workOrderId: "wo-new",
          status: "ISSUED",
        }),
      }));
    });

    it("creates a direct note from workspace FormData and revalidates paths", async () => {
      createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      const formData = new FormData();
      formData.set("customerId", "customer-1");
      formData.set("masterId", masterId);
      formData.set("title", "Direct Note");
      formData.set("operationalDate", "2026-08-31");
      formData.set("paymentDueDate", "2026-09-30");
      formData.set("sections.0.name", "General");
      formData.set("sections.0.items.0.type", "LABOR");
      formData.set("sections.0.items.0.description", "Service");
      formData.set("sections.0.items.0.quantity", "1");
      formData.set("sections.0.items.0.unitPrice", "10000");

      const result = await createDirectNoteFromWorkspace({}, formData);

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith("/admin/quotes");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/work-orders");
      expect(revalidatePath).toHaveBeenCalledWith("/admin/notas");
    });

    it("converts a draft quote to a completed note with master and paymentDueDate", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      tx.quote.findUnique.mockResolvedValue(
        operationalQuote({
          id: "quote-1",
          number: "0926-001",
          status: QuoteStatus.DRAFT,
          isLocked: false,
          sections: [{ id: "sec-1", items: [{ type: "LABOR", description: "Service", quantity: 1, unitPriceCents: 10_000 }] }],
        }),
      );

      const dueDate = new Date("2026-09-30T00:00:00.000Z");
      await convertQuoteToNoteAction({
        quoteId: "quote-1",
        masterId,
        paymentDueDate: dueDate,
        reason: "Convertida a nota",
      });

      expect(tx.quote.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: "quote-1" },
        data: expect.objectContaining({
          status: QuoteStatus.APPROVED,
          paymentDueDate: dueDate,
        }),
      }));
      expect(tx.workOrder.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: WorkOrderStatus.COMPLETED,
        }),
      }));
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          eventType: QuoteLifecycleEventType.CONVERT_TO_NOTE,
          reason: "Convertida a nota",
        }),
      }));
    });

    it("issues the linked draft payable note when completing an existing work order", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      const dueDate = new Date("2026-09-30T00:00:00.000Z");
      tx.quote.findUnique.mockResolvedValue(operationalQuote({
        id: "quote-1",
        workOrder: {
          id: "wo-existing",
          status: WorkOrderStatus.ASSIGNED,
          folio: null,
          issuedAt: null,
          paymentDueDate: null,
          assignments: [],
        },
      }));

      await convertQuoteToNoteAction({
        quoteId: "quote-1",
        paymentDueDate: dueDate,
      });

      expect(tx.payableNote.updateMany).toHaveBeenCalledWith({
        where: { workOrderId: "wo-existing", status: "DRAFT" },
        data: {
          status: "ISSUED",
          issuedAt: expect.any(Date),
          paymentDueDate: dueDate,
        },
      });
    });

    it("does not reissue the payable note when the existing work order is already completed", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);
      tx.quote.findUnique.mockResolvedValue(operationalQuote({
        id: "quote-1",
        workOrder: {
          id: "wo-completed",
          status: WorkOrderStatus.COMPLETED,
          folio: "N-0926-01",
          issuedAt: new Date("2026-09-01T00:00:00.000Z"),
          paymentDueDate: new Date("2026-09-15T00:00:00.000Z"),
          assignments: [],
        },
      }));

      await convertQuoteToNoteAction({ quoteId: "quote-1" });

      expect(tx.payableNote.updateMany).not.toHaveBeenCalled();
    });

    it("blocks converting a locked quote to note", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      tx.quote.findUnique.mockResolvedValue({
        id: "quote-locked",
        status: QuoteStatus.DRAFT,
        isLocked: true,
        customerId: "customer-1",
        items: [],
        sections: [{ id: "sec-1", items: [{ type: "LABOR", description: "S", quantity: 1, unitPriceCents: 10000 }] }],
        workOrder: null,
      });

      await expect(convertQuoteToNoteAction({
        quoteId: "quote-locked",
        masterId,
      })).rejects.toThrow(/bloqueado/i);
    });

    it("blocks rollback when the document is locked", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      tx.workOrder.findUnique.mockResolvedValue({
        id: "wo-1",
        quoteId: "quote-locked",
        status: WorkOrderStatus.COMPLETED,
        quote: { status: QuoteStatus.APPROVED, isLocked: true },
      });

      await expect(rollbackWorkOrder({
        workOrderId: "wo-1",
        targetQuoteStatus: "DRAFT",
        reason: "Corrección",
      })).rejects.toThrow(/bloqueado/i);
    });

    it("returns a note to quote via returnNoteToQuoteAction", async () => {
      const tx = createTx();
      vi.mocked(requireOperationalRole).mockResolvedValue({ profile: { id: workerId } } as never);

      tx.workOrder.findUnique.mockResolvedValue({
        id: "wo-1",
        quoteId: "quote-1",
        status: WorkOrderStatus.COMPLETED,
        quote: { status: QuoteStatus.APPROVED, isLocked: false },
      });

      const result = await returnNoteToQuoteAction({
        workOrderId: "wo-1",
        reason: "Corrección de precios",
      });

      expect(result).toEqual({ success: true });
      expect(tx.quote.updateMany).toHaveBeenCalledWith({
        where: { id: "quote-1", status: QuoteStatus.APPROVED },
        data: { status: QuoteStatus.DRAFT },
      });
      expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          eventType: "RETURN_TO_QUOTE",
          previousState: QuoteStatus.APPROVED,
          nextState: QuoteStatus.DRAFT,
          reason: "Corrección de precios",
        }),
      }));
    });
  });
});
