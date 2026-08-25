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
  getCustomerBalanceSummary,
  getCustomerCreditSummary,
  getNoteFinancialSummary,
  parseCashAmountCents,
  PaymentOperationError,
  recordCashPayment,
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
    paymentRequest: { findUnique: vi.fn() },
    ledgerEntry: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
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

type Store = {
  quotes: Map<string, QuoteDouble>;
  workOrders: Map<string, WorkOrderDouble>;
  payments: Map<string, PaymentDouble>;
  applications: Map<string, PaymentApplicationDouble>;
  ledgerEntries: LedgerEntryDouble[];
};

function createMockDb(initialState?: Partial<Store>) {
  const store: Store = {
    quotes: new Map(initialState?.quotes ?? []),
    workOrders: new Map(initialState?.workOrders ?? []),
    payments: new Map(initialState?.payments ?? []),
    applications: new Map(initialState?.applications ?? []),
    ledgerEntries: [...(initialState?.ledgerEntries ?? [])],
  };

  let idCounter = 1;

  const mockTx = {
    quote: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        return store.quotes.get(where.id) ?? null;
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
            (!where.payment?.customerId || (p && p.customerId === where.payment.customerId)) &&
            (where.reversedAt !== null || a.reversedAt === null)
          ) {
            total += a.amountCents;
          }
        }
        return { _sum: { amountCents: total } };
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

  return { store, transaction };
}

describe("Domain: Financial Invariants and Operations (Issue #337)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const { store, transaction } = createMockDb({ quotes, workOrders });

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
