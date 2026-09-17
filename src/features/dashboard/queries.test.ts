import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentStatus, PaymentStatus, QuoteItemType, SettlementAgreementStatus, WorkerKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { aggregateReceivablesByCustomer, getOperationalDashboardSnapshot } from "./queries";

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    quote: { count: vi.fn() },
    workOrder: { count: vi.fn(), findMany: vi.fn() },
    payment: { aggregate: vi.fn() },
  },
}));

const fixedNow = new Date("2026-08-19T14:00:00.000Z");

describe("aggregateReceivablesByCustomer", () => {
  it("includes only remaining completed work, aggregates customers, uses effective settlements, and prioritizes collection risk", () => {
    const workOrders = [
      {
        completedAt: new Date("2026-08-01T18:00:00.000Z"),
        paymentDueDate: new Date("2026-08-08T18:00:00.000Z"),
        quote: {
          customer: { id: "customer-a", name: "Árbol Transporte" }, paymentDueDate: null,
          subtotalCents: 100_000, taxCents: 0, totalCents: 100_000, settlementAgreement: null,
        },
        paymentApplications: [{ amountCents: 25_000 }],
      },
      {
        completedAt: new Date("2026-08-10T18:00:00.000Z"),
        paymentDueDate: new Date("2026-08-17T18:00:00.000Z"),
        quote: {
          customer: { id: "customer-a", name: "Árbol Transporte" }, paymentDueDate: null,
          subtotalCents: 40_000, taxCents: 0, totalCents: 40_000, settlementAgreement: null,
        },
        paymentApplications: [],
      },
      {
        completedAt: new Date("2026-08-02T18:00:00.000Z"),
        paymentDueDate: new Date("2026-08-09T18:00:00.000Z"),
        quote: {
          customer: { id: "customer-b", name: "Bravo Logística" }, paymentDueDate: null,
          subtotalCents: 100_000, taxCents: 0, totalCents: 100_000,
          settlementAgreement: { id: "settlement-1", status: SettlementAgreementStatus.ACTIVE, settlementBaseCents: 50_000, settlementTaxCents: 0, settlementTotalCents: 50_000 },
        },
        paymentApplications: [{ amountCents: 50_000 }],
      },
      {
        completedAt: new Date("2026-08-03T18:00:00.000Z"),
        paymentDueDate: new Date("2026-08-10T18:00:00.000Z"),
        quote: {
          customer: { id: "customer-c", name: "Camiones Centro" }, paymentDueDate: null,
          subtotalCents: 10_000, taxCents: 0, totalCents: 10_000, settlementAgreement: null,
        },
        paymentApplications: [{ amountCents: 10_000 }],
      },
    ];

    expect(aggregateReceivablesByCustomer(workOrders, fixedNow)).toEqual([
      expect.objectContaining({ customerId: "customer-a", pendingBalanceCents: 115_000, isOverdue: true }),
    ]);
  });

  it("orders overdue customers by oldest due date, then pending balance and customer name", () => {
    const note = (customerId: string, customerName: string, paymentDueDate: string, totalCents: number) => ({
      completedAt: new Date("2026-08-01T18:00:00.000Z"), paymentDueDate: new Date(paymentDueDate),
      quote: { customer: { id: customerId, name: customerName }, paymentDueDate: null, subtotalCents: totalCents, taxCents: 0, totalCents, settlementAgreement: null },
      paymentApplications: [],
    });
    const rows = aggregateReceivablesByCustomer([
      note("current", "Actual", "2026-08-25T18:00:00.000Z", 99_000),
      note("late-b", "Beta", "2026-08-10T18:00:00.000Z", 20_000),
      note("late-a", "Alfa", "2026-08-10T18:00:00.000Z", 20_000),
      note("old", "Antiguo", "2026-08-09T18:00:00.000Z", 1_000),
    ], fixedNow);

    expect(rows.map((row) => row.customerId)).toEqual(["old", "late-a", "late-b", "current"]);
  });

});

describe("getOperationalDashboardSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOperationalRole).mockResolvedValue({ user: { id: "u-1" } as never, profile: { id: "u-1", role: "ADMIN" } as never });
    vi.mocked(prisma.quote.count).mockResolvedValue(0);
    vi.mocked(prisma.workOrder.count).mockResolvedValue(0);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({ _count: { _all: 0 }, _sum: { amountCents: null } } as never);
  });

  it("queries status queues and receivables with only active payment applications", async () => {
    vi.mocked(prisma.workOrder.findMany)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: "wo-1", number: "OT-1", status: WorkOrderStatus.COMPLETED, completedAt: fixedNow, isSpecial: false, specialAssigneeName: null, quote: { id: "q-1", number: "COT-1", customer: { name: "Cliente" }, vehicle: null, items: [{ id: "i-1", type: QuoteItemType.LABOR, description: "Trabajo", quantity: 1, unitPriceCents: 100, totalCents: 100 }], sections: [] }, assignments: [{ workerId: "w-1", status: AssignmentStatus.DONE, worker: { id: "w-1", displayName: "Trabajador", workerKind: WorkerKind.MASTER, role: "WORKER" } }] }] as never);

    const snapshot = await getOperationalDashboardSnapshot(fixedNow);

    expect(snapshot.queues).toEqual({ draftQuotesCount: 0, sentQuotesCount: 0, approvedQuotesCount: 0, activeExecutionCount: 0 });
    expect(snapshot.receivables).toEqual([]);
    expect(prisma.quote.count).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: null,
        status: "DRAFT",
        NOT: {
          workOrder: {
            status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] },
          },
        },
      },
    });
    expect(prisma.quote.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "SENT" }) }));
    expect(prisma.quote.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "APPROVED" }) }));
    expect(prisma.workOrder.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { status: WorkOrderStatus.COMPLETED, quote: { customerId: { not: null } } },
      include: expect.objectContaining({ paymentApplications: expect.objectContaining({ where: { reversedAt: null, payment: { status: PaymentStatus.PAID, reversedAt: null } } }) }),
    }));
  });

  it("keeps a reversed application out of the returned balance", async () => {
    const note = {
      completedAt: new Date("2026-08-01T18:00:00.000Z"),
      paymentDueDate: new Date("2026-08-08T18:00:00.000Z"),
      quote: {
        customer: { id: "customer-reversed", name: "Pago revertido" },
        paymentDueDate: null,
        subtotalCents: 80_000,
        taxCents: 0,
        totalCents: 80_000,
        settlementAgreement: null,
      },
    };
    const reversedApplication = { amountCents: 30_000 };

    vi.mocked(prisma.workOrder.findMany)
      .mockImplementationOnce((args) => {
        const paymentApplications = (args as { include: { paymentApplications: { where: { reversedAt: null; payment: { status: PaymentStatus; reversedAt: null } } } } }).include.paymentApplications;
        const excludesReversals = paymentApplications.where.reversedAt === null
          && paymentApplications.where.payment.status === PaymentStatus.PAID
          && paymentApplications.where.payment.reversedAt === null;

        return Promise.resolve([{ ...note, paymentApplications: excludesReversals ? [] : [reversedApplication] }]) as never;
      })
      .mockResolvedValueOnce([] as never);

    const snapshot = await getOperationalDashboardSnapshot(fixedNow);

    expect(snapshot.receivables).toEqual([
      expect.objectContaining({ customerId: "customer-reversed", pendingBalanceCents: 80_000 }),
    ]);
  });

  it("keeps an unpaid note at its full balance because the receivables contract intentionally omits customer credit", async () => {
    vi.mocked(prisma.workOrder.findMany)
      .mockImplementationOnce((args) => {
        const query = args as { include: { quote: { include: { customer: { select: Record<string, boolean> } } } } };
        expect(query.include.quote.include.customer.select).toEqual({ id: true, name: true });

        return Promise.resolve([{
          completedAt: new Date("2026-08-01T18:00:00.000Z"),
          paymentDueDate: new Date("2026-08-08T18:00:00.000Z"),
          quote: {
            customer: { id: "customer-credit", name: "Crédito sin aplicar" },
            paymentDueDate: null,
            subtotalCents: 50_000,
            taxCents: 0,
            totalCents: 50_000,
            settlementAgreement: null,
          },
          paymentApplications: [],
        }]) as never;
      })
      .mockResolvedValueOnce([] as never);

    const snapshot = await getOperationalDashboardSnapshot(fixedNow);

    expect(snapshot.receivables).toEqual([
      expect.objectContaining({ customerId: "customer-credit", pendingBalanceCents: 50_000 }),
    ]);
    expect(snapshot).not.toHaveProperty("availableCreditCents");
  });
});
