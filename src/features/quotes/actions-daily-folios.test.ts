import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QuoteStatus, WorkOrderStatus, UserRole, WorkerKind } from "@/generated/prisma/client";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  quote: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  workOrder: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  workAssignment: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  quoteDecision: {
    create: vi.fn(),
  },
  quoteLifecycleEvent: {
    create: vi.fn(),
  },
  quoteItem: {
    createMany: vi.fn(),
  },
  userProfile: {
    findFirst: vi.fn(),
  },
  sharedQuote: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    profile: { id: "11111111-1111-4111-8111-111111111111", role: "ADMIN", displayName: "Admin" },
  }),
}));

vi.mock("./lib/sequence", () => ({
  nextQuoteNumber: vi.fn().mockResolvedValue("0926-001"),
  nextWorkOrderNumber: vi.fn().mockResolvedValue("T-0926-01"),
  withQuoteNumberRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("./lib/quote-snapshots", () => ({
  resolveQuoteSnapshots: vi.fn().mockResolvedValue({
    customerSnapshot: null,
    contactSnapshot: null,
  }),
}));

vi.mock("@/features/vehicles/actions", () => ({
  findOrCreateVehicle: vi.fn().mockResolvedValue(null),
}));

vi.mock("./domain", () => ({
  ensureSharedQuoteInTransaction: vi.fn().mockResolvedValue({ id: "sq-1" }),
}));

vi.mock("@/features/work-orders/notifications", () => ({
  notifyCustomerWorkOrderCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/completed-work-knowledge/service", () => ({
  scheduleCompletedWorkKnowledge: vi.fn().mockResolvedValue(undefined),
  prepareCompletedWorkKnowledge: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createQuote, duplicateQuote } from "./actions";
import { completeWorkOrder, convertQuoteToNoteAction, createDirectWorkOrder } from "@/features/work-orders/actions";

const validMasterId = "11111111-1111-4111-8111-111111111111";

describe("Daily folios lifecycle integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("assigns C folio when creating a real quote", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 1 }]),
      quote: {
        create: vi.fn().mockResolvedValue({
          id: "q-1",
          number: "0926-001",
          folio: "C-090926-01",
          sections: [{ id: "sec-1", sortOrder: 0 }],
        }),
      },
      quoteItem: { createMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await createQuote({
      customerId: "cust-1",
      title: "Real Quote",
      vehicle: { plate: "", brand: "", model: "", color: "", year: "" },
      sections: [
        {
          name: "General",
          items: [{ type: "LABOR", description: "Service", quantity: 1, unitPriceCents: 1000 }],
        },
      ],
    });

    expect(mockTx.quote.create).toHaveBeenCalledOnce();
    const createData = mockTx.quote.create.mock.calls[0][0].data;
    expect(createData.number).toBe("0926-001");
    expect(createData.folio).toBe("C-090926-01");
    expect(createData.issuedAt).toBeInstanceOf(Date);
  });

  it("assigns a fresh C folio when duplicating a quote", async () => {
    prismaMock.quote.findUnique.mockResolvedValue({
      id: "q-orig",
      number: "0926-001",
      folio: "C-090926-01",
      title: "Original",
      customerId: "cust-1",
      sections: [],
      items: [],
      administrative: false,
      taxEnabled: true,
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 160,
      totalCents: 1160,
    });

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 2 }]),
      quote: {
        create: vi.fn().mockResolvedValue({
          id: "q-copy",
          number: "0926-002",
          folio: "C-090926-02",
          sections: [],
        }),
      },
      quoteItem: { createMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await duplicateQuote("q-orig");

    expect(mockTx.quote.create).toHaveBeenCalledOnce();
    const createData = mockTx.quote.create.mock.calls[0][0].data;
    expect(createData.folio).toBe("C-090926-02");
    expect(createData.issuedAt).toBeInstanceOf(Date);
  });

  it("direct note assigns N folio only and leaves underlying quote folio null", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 1 }]),
      userProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: validMasterId, role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true }),
      },
      quote: {
        create: vi.fn().mockResolvedValue({
          id: "q-direct",
          number: "0926-001",
          sections: [{ id: "sec-1", sortOrder: 0 }],
        }),
      },
      quoteItem: { createMany: vi.fn() },
      quoteDecision: { create: vi.fn() },
      quoteLifecycleEvent: { create: vi.fn() },
      workOrder: {
        create: vi.fn().mockResolvedValue({ id: "wo-direct", number: "T-0926-01", folio: "N-090926-01" }),
      },
      payableNote: { create: vi.fn() },
      workAssignment: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await createDirectWorkOrder({
      customerId: "cust-1",
      masterId: validMasterId,
      title: "Direct Note",
      vehicle: { plate: "", brand: "", model: "", color: "", year: "" },
      isCompleted: true,
      sections: [
        {
          name: "General",
          items: [{ type: "LABOR", description: "Work", quantity: 1, unitPriceCents: 5000 }],
        },
      ],
    });

    const quoteData = mockTx.quote.create.mock.calls[0][0].data;
    expect(quoteData.folio).toBeUndefined(); // null or undefined, never assigned C
    const woData = mockTx.workOrder.create.mock.calls[0][0].data;
    expect(woData.folio).toBe("N-090926-01");
    expect(woData.issuedAt).toBeInstanceOf(Date);
  });

  it("direct non-completed work order does not allocate N folio yet", async () => {
    const mockTx = {
      $queryRaw: vi.fn(),
      userProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: validMasterId, role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true }),
      },
      quote: {
        create: vi.fn().mockResolvedValue({
          id: "q-direct-assigned",
          number: "0926-001",
          sections: [{ id: "sec-1", sortOrder: 0 }],
        }),
      },
      quoteItem: { createMany: vi.fn() },
      quoteDecision: { create: vi.fn() },
      quoteLifecycleEvent: { create: vi.fn() },
      workOrder: {
        create: vi.fn().mockResolvedValue({ id: "wo-assigned", number: "T-0926-01", folio: null }),
      },
      payableNote: { create: vi.fn() },
      workAssignment: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await createDirectWorkOrder({
      customerId: "cust-1",
      masterId: validMasterId,
      title: "Direct Work Order",
      vehicle: { plate: "", brand: "", model: "", color: "", year: "" },
      isCompleted: false,
      sections: [
        {
          name: "General",
          items: [{ type: "LABOR", description: "Work", quantity: 1, unitPriceCents: 5000 }],
        },
      ],
    });

    expect(mockTx.$queryRaw).not.toHaveBeenCalled();
    const woData = mockTx.workOrder.create.mock.calls[0][0].data;
    expect(woData.folio).toBeNull();
    expect(woData.issuedAt).toBeNull();
  });

  it("completeWorkOrder allocates N folio when work order is completed", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 3 }]),
      workOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: "wo-1",
          number: "T-0926-01",
          folio: null,
          status: WorkOrderStatus.ASSIGNED,
          quote: {
            status: QuoteStatus.APPROVED,
            customerId: "cust-1",
            taxEnabled: false,
            subtotalCents: 1000,
            discountCents: 0,
            taxCents: 0,
            totalCents: 1000,
            sections: [
              {
                id: "sec-1",
                name: "General",
                items: [{ id: "it-1", type: "LABOR", description: "Oil change", quantity: "1", unitPriceCents: 1000, totalCents: 1000 }],
              },
            ],
            items: [{ id: "it-1", type: "LABOR", description: "Oil change", quantity: "1", unitPriceCents: 1000, totalCents: 1000 }],
          },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: "wo-1", folio: "N-090926-03" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "wo-1", folio: "N-090926-03" }),
      },
      payableNote: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workAssignment: { updateMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await completeWorkOrder({ workOrderId: "wo-1" });

    expect(mockTx.$queryRaw).toHaveBeenCalledOnce();
    expect(mockTx.workOrder.update).toHaveBeenCalledWith({
      where: { id: "wo-1" },
      data: {
        folio: "N-090926-03",
        issuedAt: expect.any(Date),
      },
    });
  });

  it("re-completion preserves existing N folio and does not allocate a new sequence", async () => {
    const existingIssuedAt = new Date("2026-09-09T10:00:00.000Z");
    const mockTx = {
      $queryRaw: vi.fn(),
      workOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: "wo-1",
          number: "T-0926-01",
          folio: "N-090926-01",
          issuedAt: existingIssuedAt,
          status: WorkOrderStatus.ASSIGNED,
          quote: {
            status: QuoteStatus.APPROVED,
            customerId: "cust-1",
            taxEnabled: false,
            subtotalCents: 1000,
            discountCents: 0,
            taxCents: 0,
            totalCents: 1000,
            sections: [
              {
                id: "sec-1",
                name: "General",
                items: [{ id: "it-1", type: "LABOR", description: "Oil change", quantity: "1", unitPriceCents: 1000, totalCents: 1000 }],
              },
            ],
            items: [{ id: "it-1", type: "LABOR", description: "Oil change", quantity: "1", unitPriceCents: 1000, totalCents: 1000 }],
          },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "wo-1",
          folio: "N-090926-01",
          issuedAt: existingIssuedAt,
        }),
      },
      payableNote: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workAssignment: { updateMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await completeWorkOrder({ workOrderId: "wo-1" });

    // Must NOT call $queryRaw or overwrite folio
    expect(mockTx.$queryRaw).not.toHaveBeenCalled();
    expect(mockTx.workOrder.update).not.toHaveBeenCalled();
  });

  it("convertQuoteToNoteAction retains quote C folio and allocates N folio to work order", async () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([{ lastSequence: 7 }]),
      userProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: validMasterId, role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true }),
      },
      quote: {
        findUnique: vi.fn().mockResolvedValue({
          id: "q-with-c",
          number: "0926-001",
          folio: "C-090926-01",
          status: QuoteStatus.APPROVED,
          customerId: "cust-1",
          taxEnabled: false,
          subtotalCents: 2000,
          discountCents: 0,
          taxCents: 0,
          totalCents: 2000,
          sections: [
            {
              id: "sec-1",
              name: "General",
              items: [{ id: "it-1", type: "LABOR", description: "Service", quantity: "1", unitPriceCents: 2000, totalCents: 2000 }],
            },
          ],
          items: [{ id: "it-1", type: "LABOR", description: "Service", quantity: "1", unitPriceCents: 2000, totalCents: 2000 }],
          workOrder: null,
        }),
        update: vi.fn(),
      },
      workOrder: {
        create: vi.fn().mockResolvedValue({ id: "wo-new", folio: "N-090926-07" }),
      },
      payableNote: { create: vi.fn() },
      quoteLifecycleEvent: { create: vi.fn() },
      workAssignment: { create: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    await convertQuoteToNoteAction({
      quoteId: "q-with-c",
      masterId: validMasterId,
    });

    expect(mockTx.workOrder.create).toHaveBeenCalledOnce();
    const woData = mockTx.workOrder.create.mock.calls[0][0].data;
    expect(woData.folio).toBe("N-090926-07");
    expect(woData.quoteId).toBe("q-with-c");
    // Quote update must NOT wipe C folio
    expect(mockTx.quote.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ folio: expect.anything() }) }),
    );
  });
});
