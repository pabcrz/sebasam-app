import {
  LedgerEntryType,
  LedgerMovementType,
  PaymentMethod,
  PaymentStatus,
  QuoteStatus,
  WorkOrderStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  applyCustomerCredit,
  correctPayment,
  getCustomerBalanceSummary,
  getCustomerCreditSummary,
  getNoteFinancialSummary,
  lockPaymentMutationScope,
  recordPayment,
  reversePaymentCapture,
} from "./domain";
import { getCustomerAccountStatement } from "@/features/customers/queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    customer: { findUnique: vi.fn(), findMany: vi.fn() },
    quote: { findUnique: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    workOrder: { findUnique: vi.fn(), findMany: vi.fn() },
    payment: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    paymentApplication: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    paymentCorrection: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    paymentCorrectionApplication: { findMany: vi.fn(), create: vi.fn() },
    paymentRequest: { findUnique: vi.fn() },
    ledgerEntry: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    profile: { id: "user-1", role: "ADMIN", displayName: "Admin User" },
  }),
  requireAdmin: vi.fn().mockResolvedValue({
    user: { id: "user-1" },
    profile: { id: "user-1", role: "ADMIN", displayName: "Admin User" },
  }),
}));

type QuoteDouble = {
  id: string;
  customerId: string | null;
  status: QuoteStatus;
  totalCents: number | null;
  number?: string;
  [key: string]: unknown;
};

type WorkOrderDouble = {
  id: string;
  quoteId: string;
  status: WorkOrderStatus;
  number?: string;
  [key: string]: unknown;
};

type PaymentDouble = {
  id: string;
  customerId: string;
  amountCents: number;
  status: PaymentStatus;
  reversedAt: Date | null;
  operationKey: string;
  quoteId?: string | null;
  reversalReason?: string | null;
  [key: string]: unknown;
};

type PaymentApplicationDouble = {
  id: string;
  paymentId: string;
  workOrderId: string;
  amountCents: number;
  reversedAt: Date | null;
  operationKey: string;
  reversalReason?: string | null;
  [key: string]: unknown;
};

type LedgerEntryDouble = {
  id: string;
  customerId: string;
  type: LedgerEntryType;
  movementType: LedgerMovementType;
  amountCents: number;
  createdAt: Date;
  paymentId?: string | null;
  paymentApplicationId?: string | null;
  workOrderId?: string | null;
  actorId?: string | null;
  reason?: string | null;
  [key: string]: unknown;
};

type CorrectionDouble = {
  id: string;
  operationKey: string;
  originalPaymentId: string;
  replacementPaymentId: string;
  reason: string;
  actorId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
};

type CorrectionApplicationDouble = {
  id: string;
  paymentCorrectionId: string;
  originalApplicationId: string;
  replacementApplicationId: string | null;
  workOrderId: string;
  originalAmountCents: number;
  replacementAmountCents: number;
  shortfallCents: number;
  sortOrder: number;
  createdAt: Date;
  [key: string]: unknown;
};

type Store = {
  quotes: Map<string, QuoteDouble>;
  workOrders: Map<string, WorkOrderDouble>;
  payments: Map<string, PaymentDouble>;
  applications: Map<string, PaymentApplicationDouble>;
  ledgerEntries: LedgerEntryDouble[];
  corrections: Map<string, CorrectionDouble>;
  correctionApplications: Map<string, CorrectionApplicationDouble>;
};

function createMockDb(initialState?: Partial<Store>) {
  const store: Store = {
    quotes: new Map(initialState?.quotes ?? []),
    workOrders: new Map(initialState?.workOrders ?? []),
    payments: new Map(initialState?.payments ?? []),
    applications: new Map(Array.from(initialState?.applications ?? []).map(([id, application]) => [
      id,
      { ...application, payableNoteId: application.payableNoteId ?? `payable-${application.workOrderId}` },
    ])),
    ledgerEntries: [...(initialState?.ledgerEntries ?? [])],
    corrections: new Map(initialState?.corrections ?? []),
    correctionApplications: new Map(initialState?.correctionApplications ?? []),
  };

  let idCounter = 1;

  const mockTx = {
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    quote: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        return store.quotes.get(where.id) ?? null;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        let quotes = Array.from(store.quotes.values());
        if (where?.id?.in) quotes = quotes.filter((q) => where.id.in.includes(q.id));
        if (where?.customerId) quotes = quotes.filter((q) => q.customerId === where.customerId);
        if (where?.status) quotes = quotes.filter((q) => q.status === where.status);
        if (where?.workOrder?.status) {
          quotes = quotes.filter((q) =>
            Array.from(store.workOrders.values()).some(
              (workOrder) => workOrder.quoteId === q.id && workOrder.status === where.workOrder.status,
            ),
          );
        }
        return quotes;
      }),
      aggregate: vi.fn().mockImplementation(async ({ where }) => {
        let total = 0;
        for (const q of store.quotes.values()) {
          if (q.customerId === where.customerId && q.status === where.status) {
            total += q.totalCents ?? 0;
          }
        }
        return { _sum: { totalCents: total } };
      }),
    },
    workOrder: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id) {
          const wo = store.workOrders.get(where.id);
          if (!wo) return null;
          const q = store.quotes.get(wo.quoteId);
          return { ...wo, quote: q };
        }
        if (where.quoteId) {
          for (const wo of store.workOrders.values()) {
            if (wo.quoteId === where.quoteId) {
              const q = store.quotes.get(wo.quoteId);
              return { ...wo, quote: q };
            }
          }
          return null;
        }
        return null;
      }),
      findMany: vi.fn().mockImplementation(async () => {
        return Array.from(store.workOrders.values()).map((wo) => ({
          ...wo,
          quote: store.quotes.get(wo.quoteId),
          paymentApplications: Array.from(store.applications.values()).filter((a) => a.workOrderId === wo.id),
        }));
      }),
    },
    payableNote: {
      findFirst: vi.fn().mockImplementation(async ({ where }) => ({ id: `payable-${where.workOrderId}` })),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        const workOrderId = where.id.replace("payable-", "");
        const workOrder = store.workOrders.get(workOrderId);
        const quote = workOrder ? store.quotes.get(workOrder.quoteId) : null;
        if (!workOrder || !quote) return null;
        return {
          id: where.id,
          customerId: quote.customerId,
          quoteId: quote.id,
          workOrderId,
          referenceNumber: workOrder.number ?? workOrderId,
          title: "Test note",
          totalCents: quote.totalCents,
          status: "ISSUED",
          issuedAt: null,
          paymentDueDate: null,
          quote,
        };
      }),
    },
    paymentRequest: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    payment: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id) {
          const p = store.payments.get(where.id);
          if (!p) return null;
          const apps = Array.from(store.applications.values()).filter((a) => a.paymentId === p.id);
          return { ...p, applications: apps };
        }
        if (where.operationKey) {
          for (const p of store.payments.values()) {
            if (p.operationKey === where.operationKey) {
              const apps = Array.from(store.applications.values()).filter((a) => a.paymentId === p.id);
              return { ...p, applications: apps };
            }
          }
          return null;
        }
        return null;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        let list = Array.from(store.payments.values());
        if (where?.customerId) list = list.filter((p) => p.customerId === where.customerId);
        if (where?.status) list = list.filter((p) => p.status === where.status);
        if (where?.reversedAt === null) list = list.filter((p) => p.reversedAt === null);

        return list.map((p) => ({
          ...p,
          applications: Array.from(store.applications.values()).filter((a) => a.paymentId === p.id && a.reversedAt === null),
        }));
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `payment-${idCounter++}`;
        const record = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          reversedAt: null,
          reversalReason: null,
          reversedById: null,
          ...data,
        };
        store.payments.set(id, record);
        return record;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const p = store.payments.get(where.id);
        if (!p) throw new Error("Payment not found");
        const updated = { ...p, ...data };
        store.payments.set(where.id, updated);
        return updated;
      }),
      aggregate: vi.fn().mockImplementation(async ({ where }) => {
        let total = 0;
        for (const p of store.payments.values()) {
          if (
            (!where.customerId || p.customerId === where.customerId) &&
            (!where.status || p.status === where.status) &&
            (where.reversedAt !== null || p.reversedAt === null)
          ) {
            total += p.amountCents;
          }
        }
        return { _sum: { amountCents: total } };
      }),
    },
    paymentApplication: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.id) return store.applications.get(where.id) ?? null;
        if (where.operationKey) {
          for (const a of store.applications.values()) {
            if (a.operationKey === where.operationKey) {
              const wo = store.workOrders.get(a.workOrderId);
              if (!wo) return null;
              return { ...a, workOrder: { ...wo, quote: store.quotes.get(wo.quoteId) } };
            }
          }
          return null;
        }
        return null;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        let list = Array.from(store.applications.values());
        if (where?.workOrderId) {
          const ids = where.workOrderId.in ? where.workOrderId.in : [where.workOrderId];
          list = list.filter((a) => ids.includes(a.workOrderId));
        }
        if (where?.paymentId) {
          const ids = where.paymentId.in ? where.paymentId.in : [where.paymentId];
          list = list.filter((a) => ids.includes(a.paymentId));
        }
        if (where?.reversedAt === null) list = list.filter((a) => a.reversedAt === null);
        if (where?.payment?.reversedAt === null) {
          list = list.filter((a) => {
            const p = store.payments.get(a.paymentId);
            return p && p.reversedAt === null;
          });
        }
        return list.map((a) => {
          const wo = store.workOrders.get(a.workOrderId);
          return { ...a, workOrder: wo ? { ...wo, quote: store.quotes.get(wo.quoteId) } : null };
        });
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `app-${idCounter++}`;
        const record = {
          id,
          createdAt: new Date(),
          reversedAt: null,
          reversalReason: null,
          reversedById: null,
          ...data,
        };
        store.applications.set(id, record);
        return record;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const a = store.applications.get(where.id);
        if (!a) throw new Error("Application not found");
        const updated = { ...a, ...data };
        store.applications.set(where.id, updated);
        return updated;
      }),
      aggregate: vi.fn().mockImplementation(async ({ where }) => {
        let total = 0;
        for (const a of store.applications.values()) {
          const p = store.payments.get(a.paymentId);
          if (
            (!where.workOrderId || a.workOrderId === where.workOrderId) &&
            (!where.payableNoteId || a.payableNoteId === where.payableNoteId) &&
            (!where.payment?.customerId || (p && p.customerId === where.payment.customerId)) &&
            (!where.payment?.status || (p && p.status === where.payment.status)) &&
            (where.payment?.reversedAt !== null || (p && p.reversedAt === null)) &&
            (where.reversedAt !== null || a.reversedAt === null)
          ) {
            total += a.amountCents;
          }
        }
        return { _sum: { amountCents: total } };
      }),
    },
    paymentCorrection: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.operationKey) {
          for (const c of store.corrections.values()) {
            if (c.operationKey === where.operationKey) return c;
          }
        }
        if (where.id) return store.corrections.get(where.id) ?? null;
        return null;
      }),
      findFirst: vi.fn().mockImplementation(async ({ where }) => {
        if (where?.originalPaymentId) {
          for (const c of store.corrections.values()) {
            if (c.originalPaymentId === where.originalPaymentId) return c;
          }
        }
        return null;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `corr-${idCounter++}`;
        const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
        store.corrections.set(id, record);
        return record;
      }),
    },
    paymentCorrectionApplication: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `capp-${idCounter++}`;
        const record = { id, createdAt: new Date(), ...data };
        store.correctionApplications.set(id, record);
        return record;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        let list = Array.from(store.correctionApplications.values());
        if (where?.paymentCorrectionId) list = list.filter((a) => a.paymentCorrectionId === where.paymentCorrectionId);
        return list;
      }),
    },
    userProfile: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (!where?.id) return null;
        return { id: where.id, displayName: "Admin User" };
      }),
    },
    ledgerEntry: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = `ledger-${idCounter++}`;
        const record = { id, createdAt: new Date(), ...data };
        store.ledgerEntries.push(record);
        return record;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }) => {
        let list = [...store.ledgerEntries];
        if (where?.customerId) list = list.filter((e) => e.customerId === where.customerId);
        if (where?.movementType) list = list.filter((e) => e.movementType === where.movementType);
        if (where?.paymentId) list = list.filter((e) => e.paymentId === where.paymentId);
        if (where?.paymentApplicationId) list = list.filter((e) => e.paymentApplicationId === where.paymentApplicationId);
        return list.map((e) => {
          const p = e.paymentId ? store.payments.get(e.paymentId) : null;
          const q = p?.quoteId ? store.quotes.get(p.quoteId) : null;
          const app = e.paymentApplicationId ? store.applications.get(e.paymentApplicationId) : null;
          const wo = e.workOrderId ? store.workOrders.get(e.workOrderId) : null;

          return {
            ...e,
            actor: e.actorId ? { id: e.actorId, displayName: "Admin User" } : null,
            payment: p ? { ...p, quote: q ? { id: q.id, number: q.number } : null } : null,
            paymentApplication: app,
            workOrder: wo ? { id: wo.id, number: wo.number, status: wo.status } : null,
          };
        });
      }),
    },
  };

  type PaymentTransaction = Parameters<typeof getNoteFinancialSummary>[0];
  const transaction = mockTx as unknown as PaymentTransaction;

  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: (tx: PaymentTransaction) => Promise<unknown>) => callback(transaction),
  );

  // Link mock prisma client methods to mockTx
  Object.assign(prisma.quote, mockTx.quote);
  Object.assign(prisma.workOrder, mockTx.workOrder);
  Object.assign(prisma.payment, mockTx.payment);
  Object.assign(prisma.paymentApplication, mockTx.paymentApplication);
  Object.assign(prisma.ledgerEntry, mockTx.ledgerEntry);
  Object.assign(prisma.paymentCorrection, mockTx.paymentCorrection);
  Object.assign(prisma.paymentCorrectionApplication, mockTx.paymentCorrectionApplication);
  Object.assign(prisma.userProfile, mockTx.userProfile);

  return { store, transaction };
}

describe("Domain: Financial Invariants and Operations (Issue #337)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes only approved quotes with completed work orders in the customer balance", async () => {
    const quotes = new Map<string, QuoteDouble>([
      ["quote-incomplete", { id: "quote-incomplete", customerId: "cust-1", status: QuoteStatus.APPROVED, totalCents: 10_000 }],
      ["quote-completed", { id: "quote-completed", customerId: "cust-1", status: QuoteStatus.APPROVED, totalCents: 15_000 }],
    ]);
    const workOrders = new Map<string, WorkOrderDouble>([
      ["wo-incomplete", { id: "wo-incomplete", quoteId: "quote-incomplete", status: WorkOrderStatus.IN_PROGRESS }],
      ["wo-completed", { id: "wo-completed", quoteId: "quote-completed", status: WorkOrderStatus.COMPLETED }],
    ]);
    const { transaction } = createMockDb({ quotes, workOrders });

    const summary = await getCustomerBalanceSummary(transaction, "cust-1");

    expect(summary.totalContractedCents).toBe(15_000);
    expect(summary.pendingBalanceCents).toBe(15_000);
  });

  it("does not apply pending or failed payment applications to a Note balance", async () => {
    const quotes = new Map([
      ["quote-1", {
        id: "quote-1", number: "COT-001", customerId: "cust-1", status: QuoteStatus.APPROVED,
        totalCents: 10_000, subtotalCents: 10_000, taxCents: 0, discountCents: 0, taxEnabled: false,
        items: [{ id: "item-1", description: "Repair", quantity: 1, unitPriceCents: 10_000 }],
      }],
    ]);
    const workOrders = new Map([
      ["wo-1", { id: "wo-1", number: "OT-001", quoteId: "quote-1", status: WorkOrderStatus.COMPLETED }],
    ]);
    const failedStatus = "FAILED" as unknown as PaymentStatus;
    const payments = new Map<string, PaymentDouble>([
      ["payment-pending", { id: "payment-pending", customerId: "cust-1", amountCents: 3_000, status: PaymentStatus.PENDING, reversedAt: null, operationKey: "pending" }],
      ["payment-failed", { id: "payment-failed", customerId: "cust-1", amountCents: 2_000, status: failedStatus, reversedAt: null, operationKey: "failed" }],
    ]);
    const applications = new Map([
      ["app-pending", { id: "app-pending", paymentId: "payment-pending", workOrderId: "wo-1", amountCents: 3_000, reversedAt: null, operationKey: "pending:app" }],
      ["app-failed", { id: "app-failed", paymentId: "payment-failed", workOrderId: "wo-1", amountCents: 2_000, reversedAt: null, operationKey: "failed:app" }],
    ]);

    const { transaction } = createMockDb({ quotes, workOrders, payments, applications });

    await expect(getNoteFinancialSummary(transaction, "wo-1")).resolves.toMatchObject({
      appliedCents: 0,
      pendingBalanceCents: 10_000,
      isSettled: false,
    });
  });

  it("records_10000_capture_applies_8000_and_leaves_2000_customer_credit", async () => {
    const quotes = new Map([
      [
        "quote-1",
        {
          id: "quote-1",
          number: "COT-001",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 8000,
          subtotalCents: 8000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Muelles", quantity: 1, unitPriceCents: 8000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-1",
        {
          id: "wo-1",
          number: "OT-001",
          quoteId: "quote-1",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date("2026-08-20T10:00:00Z"),
        },
      ],
    ]);

    const { store, transaction } = createMockDb({ quotes, workOrders });

    const result = await recordPayment({
      workOrderId: "wo-1",
      amountCents: 10000,
      operationKey: "op-10000-capture",
      method: PaymentMethod.CASH,
      actorId: "user-admin-1",
    });

    // Payment capture recorded
    expect(result.payment.amountCents).toBe(10000);
    expect(result.payment.status).toBe(PaymentStatus.PAID);
    expect(result.appliedToNoteCents).toBe(8000);
    expect(result.notePendingBalanceCents).toBe(0);
    expect(result.customerCreditRemainingCents).toBe(2000);

    // Check payment application
    expect(store.applications.size).toBe(1);
    const app = Array.from(store.applications.values())[0];
    expect(app.amountCents).toBe(8000);
    expect(app.workOrderId).toBe("wo-1");
    expect(app.payableNoteId).toBe("payable-wo-1");

    // Check ledger entries: 1 capture + 1 application
    expect(store.ledgerEntries.length).toBe(2);
    expect(store.ledgerEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: LedgerEntryType.CREDIT,
          movementType: LedgerMovementType.PAYMENT_CAPTURE,
          amountCents: 10000,
        }),
        expect.objectContaining({
          type: LedgerEntryType.CREDIT,
          movementType: LedgerMovementType.PAYMENT_APPLICATION,
          amountCents: 8000,
          workOrderId: "wo-1",
        }),
      ]),
    );

    // Customer credit query
    const credit = await getCustomerCreditSummary(transaction, "cust-1");
    expect(credit.availableCreditCents).toBe(2000);
  });

  it("uses a 300 settlement cap for partial payments, credit, and reversal while preserving a 500 nominal quote", async () => {
    const quotes = new Map([
      ["quote-agreed", {
        id: "quote-agreed", number: "COT-AGREED", customerId: "cust-1", status: QuoteStatus.APPROVED,
        totalCents: 50_000, subtotalCents: 50_000, taxCents: 0, discountCents: 0, taxEnabled: false,
        settlementAgreement: { id: "agreement-1", status: "ACTIVE", settlementBaseCents: 30_000, settlementTaxCents: 0, settlementTotalCents: 30_000 },
        items: [{ id: "item-1", description: "Repair", quantity: 1, unitPriceCents: 50_000 }],
      }],
    ]);
    const workOrders = new Map([["wo-agreed", { id: "wo-agreed", quoteId: "quote-agreed", status: WorkOrderStatus.COMPLETED }]]);
    const { transaction } = createMockDb({ quotes, workOrders });

    const first = await recordPayment({ workOrderId: "wo-agreed", amountCents: 15_000, operationKey: "agreed-partial" });
    expect(first.appliedToNoteCents).toBe(15_000);
    expect(first.notePendingBalanceCents).toBe(15_000);

    const second = await recordPayment({ workOrderId: "wo-agreed", amountCents: 20_000, operationKey: "agreed-overpayment" });
    expect(second.appliedToNoteCents).toBe(15_000);
    expect(second.customerCreditRemainingCents).toBe(5_000);
    expect((await getNoteFinancialSummary(transaction, "wo-agreed")).pendingBalanceCents).toBe(0);

    await reversePaymentCapture({ paymentId: second.payment.id, reason: "Payment reversed", actorId: "admin-1" });
    expect((await getNoteFinancialSummary(transaction, "wo-agreed")).pendingBalanceCents).toBe(15_000);
    expect((await getCustomerCreditSummary(transaction, "cust-1")).availableCreditCents).toBe(0);
    expect(quotes.get("quote-agreed")?.totalCents).toBe(50_000);
  });

  it("does_not_auto_apply_customer_credit_to_a_future_completed_note", async () => {
    const quotes = new Map([
      [
        "quote-1",
        {
          id: "quote-1",
          number: "COT-001",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 8000,
          subtotalCents: 8000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Repair 1", quantity: 1, unitPriceCents: 8000 }],
        },
      ],
      [
        "quote-2",
        {
          id: "quote-2",
          number: "COT-002",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 5000,
          subtotalCents: 5000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-2", description: "Repair 2", quantity: 1, unitPriceCents: 5000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-1",
        {
          id: "wo-1",
          number: "OT-001",
          quoteId: "quote-1",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date("2026-08-20T10:00:00Z"),
        },
      ],
      [
        "wo-2",
        {
          id: "wo-2",
          number: "OT-002",
          quoteId: "quote-2",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date("2026-08-21T10:00:00Z"),
        },
      ],
    ]);

    const { transaction } = createMockDb({ quotes, workOrders });

    // Step 1: Capture 10,000 for Note 1 (8,000 applied, 2,000 unapplied credit)
    await recordPayment({
      workOrderId: "wo-1",
      amountCents: 10000,
      operationKey: "op-1",
    });

    // Step 2: Query Note 2 financial status (should NOT auto-apply the 2,000 credit)
    const note2Status = await getNoteFinancialSummary(transaction, "wo-2");
    expect(note2Status.chargedCents).toBe(5000);
    expect(note2Status.appliedCents).toBe(0);
    expect(note2Status.pendingBalanceCents).toBe(5000);
    expect(note2Status.isSettled).toBe(false);

    // Customer still has 2,000 available credit
    const credit = await getCustomerCreditSummary(transaction, "cust-1");
    expect(credit.availableCreditCents).toBe(2000);

    // Step 3: Explicit manual application of the 2,000 credit to Note 2
    const manualAppResult = await applyCustomerCredit({
      customerId: "cust-1",
      workOrderId: "wo-2",
      amountCents: 2000,
      operationKey: "op-manual-app-1",
      actorId: "admin-1",
    });

    expect(manualAppResult.notePendingBalanceCents).toBe(3000);
    expect(manualAppResult.customerCreditRemainingCents).toBe(0);

    // Re-verify Note 2 status after manual application
    const note2UpdatedStatus = await getNoteFinancialSummary(transaction, "wo-2");
    expect(note2UpdatedStatus.appliedCents).toBe(2000);
    expect(note2UpdatedStatus.pendingBalanceCents).toBe(3000);
  });

  it("reverses_payment_with_reason_actor_counter_movement_and_restores_note_balance", async () => {
    const quotes = new Map([
      [
        "quote-1",
        {
          id: "quote-1",
          number: "COT-001",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 8000,
          subtotalCents: 8000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Repair", quantity: 1, unitPriceCents: 8000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-1",
        {
          id: "wo-1",
          number: "OT-001",
          quoteId: "quote-1",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date("2026-08-20T10:00:00Z"),
        },
      ],
    ]);

    const { store, transaction } = createMockDb({ quotes, workOrders });

    // Step 1: Record 8,000 payment
    const paymentResult = await recordPayment({
      workOrderId: "wo-1",
      amountCents: 8000,
      operationKey: "op-payment-to-reverse",
    });

    expect(paymentResult.notePendingBalanceCents).toBe(0);

    // Step 2: Attempt reversal without reason (should reject)
    await expect(
      reversePaymentCapture({
        paymentId: paymentResult.payment.id,
        reason: "",
        actorId: "admin-1",
      }),
    ).rejects.toThrow("El motivo de la reversión es obligatorio.");

    // Step 3: Reversal with valid reason and actor
    const reversalResult = await reversePaymentCapture({
      paymentId: paymentResult.payment.id,
      reason: "Capture duplicated by teller mistake",
      actorId: "admin-1",
    });

    expect(reversalResult.paymentId).toBe(paymentResult.payment.id);
    expect(reversalResult.reversedApplicationsCount).toBe(1);

    // Verify Note 1 balance is restored back to 8,000
    const note1Status = await getNoteFinancialSummary(transaction, "wo-1");
    expect(note1Status.pendingBalanceCents).toBe(8000);
    expect(note1Status.appliedCents).toBe(0);

    // Verify Payment is marked reversed
    const paymentInStore = store.payments.get(paymentResult.payment.id);
    if (!paymentInStore) throw new Error("Payment not found in mock store");
    expect(paymentInStore.reversedAt).not.toBeNull();
    expect(paymentInStore.reversalReason).toBe("Capture duplicated by teller mistake");

    // Verify Application is marked reversed
    const appInStore = Array.from(store.applications.values())[0];
    expect(appInStore.reversedAt).not.toBeNull();
    expect(appInStore.reversalReason).toBe("Capture duplicated by teller mistake");

    // Verify Counter-Movements in Ledger (DEBIT PAYMENT_REVERSAL + DEBIT APPLICATION_REVERSAL)
    expect(store.ledgerEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: LedgerEntryType.DEBIT,
          movementType: LedgerMovementType.PAYMENT_REVERSAL,
          amountCents: 8000,
          reason: "Capture duplicated by teller mistake",
        }),
        expect.objectContaining({
          type: LedgerEntryType.DEBIT,
          movementType: LedgerMovementType.APPLICATION_REVERSAL,
          amountCents: 8000,
          reason: "Capture duplicated by teller mistake",
        }),
      ]),
    );
  });

  it("rejects_cross_customer_or_non_completed_note_application", async () => {
    const quotes = new Map([
      [
        "quote-cust1",
        {
          id: "quote-cust1",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 5000,
          subtotalCents: 5000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Repair", quantity: 1, unitPriceCents: 5000 }],
        },
      ],
      [
        "quote-cust2",
        {
          id: "quote-cust2",
          customerId: "cust-2",
          status: QuoteStatus.APPROVED,
          totalCents: 5000,
          subtotalCents: 5000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-2", description: "Repair 2", quantity: 1, unitPriceCents: 5000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-in-progress",
        {
          id: "wo-in-progress",
          quoteId: "quote-cust1",
          status: WorkOrderStatus.IN_PROGRESS,
        },
      ],
      [
        "wo-cust2",
        {
          id: "wo-cust2",
          quoteId: "quote-cust2",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date(),
        },
      ],
    ]);

    const { store } = createMockDb({ quotes, workOrders });

    // Give cust-1 5,000 credit
    store.payments.set("payment-credit-1", {
      id: "payment-credit-1",
      customerId: "cust-1",
      amountCents: 5000,
      status: PaymentStatus.PAID,
      reversedAt: null,
      operationKey: "op-initial-credit",
    });

    // 1. Cross-customer application attempt (cust-1 applying to cust-2 note)
    await expect(
      applyCustomerCredit({
        customerId: "cust-1",
        workOrderId: "wo-cust2",
        amountCents: 1000,
        operationKey: "op-cross-cust",
      }),
    ).rejects.toThrow("La nota no pertenece a este cliente.");

    // 2. Non-completed note application attempt
    await expect(
      applyCustomerCredit({
        customerId: "cust-1",
        workOrderId: "wo-in-progress",
        amountCents: 1000,
        operationKey: "op-non-completed",
      }),
    ).rejects.toThrow("Solo se puede aplicar saldo a favor a notas completadas.");
  });

  it("concurrent_applications_cannot_overspend_credit", async () => {
    const quotes = new Map([
      [
        "quote-1",
        {
          id: "quote-1",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 10000,
          subtotalCents: 10000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Repair", quantity: 1, unitPriceCents: 10000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-1",
        {
          id: "wo-1",
          quoteId: "quote-1",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date(),
        },
      ],
    ]);

    const { store } = createMockDb({ quotes, workOrders });

    // Customer only has 3,000 available credit
    store.payments.set("payment-credit-1", {
      id: "payment-credit-1",
      customerId: "cust-1",
      amountCents: 3000,
      status: PaymentStatus.PAID,
      reversedAt: null,
      operationKey: "op-initial-credit",
    });

    // Attempting to apply 4,000 when only 3,000 is available
    await expect(
      applyCustomerCredit({
        customerId: "cust-1",
        workOrderId: "wo-1",
        amountCents: 4000,
        operationKey: "op-overspend",
      }),
    ).rejects.toThrow("El cliente no cuenta con saldo a favor suficiente.");
  });

  it("retrying_each_operation_key_is_idempotent", async () => {
    const quotes = new Map([
      [
        "quote-1",
        {
          id: "quote-1",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 10000,
          subtotalCents: 10000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Repair", quantity: 1, unitPriceCents: 10000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-1",
        {
          id: "wo-1",
          quoteId: "quote-1",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date(),
        },
      ],
    ]);

    const { store } = createMockDb({ quotes, workOrders });

    // First call to recordPayment
    const firstResult = await recordPayment({
      workOrderId: "wo-1",
      amountCents: 5000,
      operationKey: "op-idempotent-key-1",
    });

    // Retry call to recordPayment with same key
    const secondResult = await recordPayment({
      workOrderId: "wo-1",
      amountCents: 5000,
      operationKey: "op-idempotent-key-1",
    });

    expect(secondResult.payment.id).toBe(firstResult.payment.id);
    expect(secondResult.appliedToNoteCents).toBe(firstResult.appliedToNoteCents);
    expect(store.payments.size).toBe(1);
    expect(store.applications.size).toBe(1);
    expect(store.ledgerEntries.length).toBe(2);
  });

  it("customer_statement_orders_auditable_charges_captures_applications_and_reversals", async () => {
    const quotes = new Map([
      [
        "quote-1",
        {
          id: "quote-1",
          number: "COT-001",
          customerId: "cust-1",
          status: QuoteStatus.APPROVED,
          totalCents: 8000,
          subtotalCents: 8000,
          taxCents: 0,
          discountCents: 0,
          taxEnabled: false,
          items: [{ id: "item-1", description: "Service 1", quantity: 1, unitPriceCents: 8000 }],
        },
      ],
    ]);
    const workOrders = new Map([
      [
        "wo-1",
        {
          id: "wo-1",
          number: "OT-001",
          quoteId: "quote-1",
          status: WorkOrderStatus.COMPLETED,
          completedAt: new Date("2026-08-01T10:00:00Z"),
        },
      ],
    ]);

    const { store } = createMockDb({ quotes, workOrders });

    // 1. Initial Note Charge
    store.ledgerEntries.push({
      id: "ledger-charge-1",
      customerId: "cust-1",
      workOrderId: "wo-1",
      type: LedgerEntryType.DEBIT,
      movementType: LedgerMovementType.NOTE_CHARGE,
      amountCents: 8000,
      createdAt: new Date("2026-08-01T10:00:00Z"),
    });

    // 2. Payment Capture (10,000) & Application (8,000)
    await recordPayment({
      workOrderId: "wo-1",
      amountCents: 10000,
      operationKey: "op-initial-10k",
      actorId: "user-1",
    });

    // 3. Payment Reversal
    const payment = Array.from(store.payments.values())[0];
    await reversePaymentCapture({
      paymentId: payment.id,
      reason: "Customer check bounced",
      actorId: "user-1",
    });

    const statement = await getCustomerAccountStatement("cust-1");

    expect(statement.movements.length).toBeGreaterThanOrEqual(5);

    const movementTypes = statement.movements.map((m) => m.movementType);
    expect(movementTypes).toContain(LedgerMovementType.NOTE_CHARGE);
    expect(movementTypes).toContain(LedgerMovementType.PAYMENT_CAPTURE);
    expect(movementTypes).toContain(LedgerMovementType.PAYMENT_APPLICATION);
    expect(movementTypes).toContain(LedgerMovementType.PAYMENT_REVERSAL);
    expect(movementTypes).toContain(LedgerMovementType.APPLICATION_REVERSAL);

    const reversalMovement = statement.movements.find((m) => m.movementType === LedgerMovementType.PAYMENT_REVERSAL);
    expect(reversalMovement?.reason).toBe("Customer check bounced");
    expect(reversalMovement?.actor?.displayName).toBe("Admin User");
  });
});

describe("lockPaymentMutationScope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("locks payments and quotes in ascending id order and re-reads active applications", async () => {
    const quotes = new Map([
      ["quote-1", { id: "quote-1", customerId: "cust-1", status: QuoteStatus.APPROVED, totalCents: 10000 }],
    ]);
    const workOrders = new Map([
      ["wo-1", { id: "wo-1", quoteId: "quote-1", status: WorkOrderStatus.COMPLETED }],
    ]);
    const payments = new Map([
      ["pay-1", { id: "pay-1", customerId: "cust-1", amountCents: 10000, status: PaymentStatus.PAID, reversedAt: null, operationKey: "op-1" }],
    ]);
    const applications = new Map([
      ["app-1", { id: "app-1", paymentId: "pay-1", workOrderId: "wo-1", amountCents: 10000, reversedAt: null, operationKey: "op-1:app" }],
    ]);

    const { transaction } = createMockDb({ quotes, workOrders, payments, applications });

    const result = await lockPaymentMutationScope(transaction, { paymentIds: ["pay-1"], quoteIds: ["quote-1"] });

    expect(result.lockedPayments.map((p) => p.id)).toEqual(["pay-1"]);
    expect(result.lockedQuotes.map((q) => q.id)).toEqual(["quote-1"]);
    expect(result.activeApplications.map((a) => a.id)).toEqual(["app-1"]);
  });
});

describe("correctPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  function baseCorrectionStore() {
    const quotes = new Map([
      [
        "quote-1",
        { id: "quote-1", customerId: "cust-1", status: QuoteStatus.APPROVED, totalCents: 10000, subtotalCents: 10000, taxCents: 0, discountCents: 0, taxEnabled: false, items: [{ description: "Repair", quantity: 1, unitPriceCents: 10000 }] },
      ],
    ]);
    const workOrders = new Map([
      ["wo-1", { id: "wo-1", quoteId: "quote-1", status: WorkOrderStatus.COMPLETED, completedAt: new Date("2026-08-20T10:00:00Z") }],
    ]);
    const { store, transaction } = createMockDb({ quotes, workOrders });
    return { store, transaction };
  }

  it("returns correction audit fields and per-application allocation summary", async () => {
    baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10_000, operationKey: "op-original-audit", actorId: "user-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T10:00:00.000Z"));
    const result = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10_000,
      method: PaymentMethod.TRANSFER,
      reason: "Audit fields test",
      operationKey: "op-correct-audit",
      actorId: "admin-1",
    });
    vi.useRealTimers();

    expect(result.reason).toBe("Audit fields test");
    expect(result.actorId).toBe("admin-1");
    expect(result.createdAt).toEqual(new Date("2026-08-25T10:00:00.000Z"));
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]).toMatchObject({
      workOrderId: "wo-1",
      originalAmountCents: 10_000,
      replacementAmountCents: 10_000,
      shortfallCents: 0,
    });
  });

  it("records actor, reason and a current-timestamp correction", async () => {
    const { store } = baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10000, operationKey: "op-original", actorId: "user-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T10:00:00.000Z"));
    const result = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10000,
      method: PaymentMethod.TRANSFER,
      reason: "Wrong method recorded",
      operationKey: "op-correct-1",
      actorId: "admin-1",
    });
    vi.useRealTimers();

    expect(result.originalPaymentId).toBe(paymentResult.payment.id);
    expect(result.replacementAmountCents).toBe(10000);
    expect(result.method).toBe(PaymentMethod.TRANSFER);

    const correction = Array.from(store.corrections.values())[0];
    expect(correction.reason).toBe("Wrong method recorded");
    expect(correction.actorId).toBe("admin-1");
    expect(correction.createdAt).toEqual(new Date("2026-08-25T10:00:00.000Z"));

    const original = store.payments.get(paymentResult.payment.id);
    expect(original?.reversedAt).not.toBeNull();
  });

  it("rejects a second correction for the same original payment", async () => {
    baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10000, operationKey: "op-original-2" });

    await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10000,
      method: PaymentMethod.TRANSFER,
      reason: "First correction",
      operationKey: "op-correct-2a",
      actorId: "admin-1",
    });

    await expect(
      correctPayment({
        originalPaymentId: paymentResult.payment.id,
        amountCents: 10000,
        method: PaymentMethod.CASH,
        reason: "Second correction",
        operationKey: "op-correct-2b",
        actorId: "admin-1",
      }),
    ).rejects.toThrow();
  });

  it("is idempotent when retried with the same operation key", async () => {
    const { store } = baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10000, operationKey: "op-original-3" });

    const first = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10000,
      method: PaymentMethod.TRANSFER,
      reason: "Retry test",
      operationKey: "op-correct-3",
      actorId: "admin-1",
    });

    const second = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10000,
      method: PaymentMethod.TRANSFER,
      reason: "Retry test",
      operationKey: "op-correct-3",
      actorId: "admin-1",
    });

    expect(second.correctionId).toBe(first.correctionId);
    expect(second.replacementPaymentId).toBe(first.replacementPaymentId);
    expect(store.payments.size).toBe(2); // original + replacement
    expect(store.corrections.size).toBe(1);
  });

  it("replays applications in order and records per-target shortfall when replacement is smaller", async () => {
    const { store, transaction } = baseCorrectionStore();

    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 5000, operationKey: "op-split-original" });

    const originalApp = Array.from(store.applications.values()).find((a) => a.paymentId === paymentResult.payment.id);
    expect(originalApp).toBeDefined();

    const result = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 4000,
      method: PaymentMethod.CASH,
      reason: "Smaller correction",
      operationKey: "op-correct-small",
      actorId: "admin-1",
    });

    expect(result.totalShortfallCents).toBe(1000);
    expect(result.appliedApplicationsCount).toBe(1);

    const mappings = Array.from(store.correctionApplications.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    expect(mappings).toHaveLength(1);
    expect(mappings[0].originalApplicationId).toBe(originalApp!.id);
    expect(mappings[0].originalAmountCents).toBe(5000);
    expect(mappings[0].replacementAmountCents).toBe(4000);
    expect(mappings[0].shortfallCents).toBe(1000);

    const note1 = await getNoteFinancialSummary(transaction, "wo-1");
    expect(note1.pendingBalanceCents).toBe(6000);
  });

  it("leaves excess replacement amount as customer credit", async () => {
    const { transaction } = baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10000, operationKey: "op-excess-original" });

    const result = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 12000,
      method: PaymentMethod.CASH,
      reason: "Customer paid more than expected",
      operationKey: "op-correct-excess",
      actorId: "admin-1",
    });

    expect(result.excessCreditCents).toBe(2000);
    const credit = await getCustomerCreditSummary(transaction, "cust-1");
    expect(credit.availableCreditCents).toBe(2000);
  });

  it("links reversal ledger entries to their original movements", async () => {
    const { store } = baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10000, operationKey: "op-ledger-original", actorId: "user-1" });

    await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10000,
      method: PaymentMethod.TRANSFER,
      reason: "Ledger link test",
      operationKey: "op-correct-ledger",
      actorId: "admin-1",
    });

    const originalCapture = store.ledgerEntries.find((e) => e.movementType === LedgerMovementType.PAYMENT_CAPTURE && e.paymentId === paymentResult.payment.id);
    const reversalCapture = store.ledgerEntries.find((e) => e.movementType === LedgerMovementType.PAYMENT_REVERSAL && e.paymentId === paymentResult.payment.id);
    expect(reversalCapture?.reversedMovementId).toBe(originalCapture?.id);
  });

  it("uses the post-lock active application set, not a stale initial read", async () => {
    const { store, transaction } = baseCorrectionStore();
    const paymentResult = await recordPayment({ workOrderId: "wo-1", amountCents: 10000, operationKey: "op-stale-original", actorId: "user-1" });

    // Simulate a concurrent reversal that happens after the initial payment
    // read but before the correction acquires its locks: the lock re-read sees
    // no active applications, so the correction must not replay the stale app.
    const originalFindMany = transaction.paymentApplication.findMany;
    transaction.paymentApplication.findMany = vi.fn(async ({ where }: { where?: { paymentId?: { in?: string[] } | string } }) => {
      const maybeIds = where?.paymentId && typeof where.paymentId === "object" && "in" in where.paymentId ? where.paymentId.in : [];
      const ids = Array.isArray(maybeIds) ? maybeIds : [];
      if (ids.includes(paymentResult.payment.id)) {
        return [];
      }
      return originalFindMany({ where });
    }) as typeof originalFindMany;

    const result = await correctPayment({
      originalPaymentId: paymentResult.payment.id,
      amountCents: 10000,
      method: PaymentMethod.CASH,
      reason: "Stale read race",
      operationKey: "op-stale-correct",
      actorId: "admin-1",
    });

    expect(result.reversedApplicationsCount).toBe(0);
    expect(result.appliedApplicationsCount).toBe(0);
    expect(result.totalShortfallCents).toBe(0);
    expect(result.excessCreditCents).toBe(10000);
    expect(store.correctionApplications.size).toBe(0);
  });
});
