import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerAccountStatement, getCustomerDeletionBlocker, listCustomers } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findMany: vi.fn(), findUnique: vi.fn() },
    quote: { aggregate: vi.fn(), findMany: vi.fn() },
    payment: { aggregate: vi.fn() },
    paymentApplication: { aggregate: vi.fn() },
    ledgerEntry: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

function getFindManyCall() {
  return (prisma.customer.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

describe("listCustomers search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns all customers when no query is provided", async () => {
    await listCustomers();

    const call = getFindManyCall();
    expect(call.where).toBeUndefined();
  });

  it("searches all customer, contact, fiscal and vehicle fields", async () => {
    await listCustomers({ query: "ABC-123" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      OR: [
        { name: { contains: "ABC-123", mode: "insensitive" } },
        { commercialName: { contains: "ABC-123", mode: "insensitive" } },
        { legalName: { contains: "ABC-123", mode: "insensitive" } },
        { email: { contains: "ABC-123", mode: "insensitive" } },
        { phone: { contains: "ABC-123", mode: "insensitive" } },
        { address: { contains: "ABC-123", mode: "insensitive" } },
        { notes: { contains: "ABC-123", mode: "insensitive" } },
        {
          vehicles: {
            some: {
              OR: [
                { plate: { contains: "ABC-123", mode: "insensitive" } },
                { economicNumber: { contains: "ABC-123", mode: "insensitive" } },
              ],
            },
          },
        },
        {
          fiscalProfiles: {
            some: {
              OR: [
                { businessName: { contains: "ABC-123", mode: "insensitive" } },
                { taxId: { contains: "ABC-123", mode: "insensitive" } },
              ],
            },
          },
        },
        {
          contacts: {
            some: {
              OR: [
                { name: { contains: "ABC-123", mode: "insensitive" } },
                { phone: { contains: "ABC-123", mode: "insensitive" } },
              ],
            },
          },
        },
        { phone: { contains: "123" } },
        { contacts: { some: { phone: { contains: "123" } } } },
      ],
    });
  });

  it("limits results to 50 customers and includes relation counts", async () => {
    await listCustomers();

    const call = getFindManyCall();
    expect(call.take).toBe(50);
    expect(call.include).toEqual({
      _count: {
        select: {
          quotes: true,
          payments: true,
          paymentRequests: true,
          ledgerEntries: true,
        },
      },
      contacts: {
        orderBy: [
          { isActive: "desc" },
          { role: "asc" },
          { name: "asc" },
        ],
      },
      fiscalProfiles: {
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "asc" },
        ],
      },
    });
  });
});

describe("getCustomerDeletionBlocker", () => {
  it("allows deletion when customer has zero related quotes and financial records", () => {
    const blocker = getCustomerDeletionBlocker({
      _count: { quotes: 0, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
    });
    expect(blocker).toEqual({ canDelete: true, reason: null });
  });

  it("blocks deletion with singular quote reason when customer has 1 quote", () => {
    const blocker = getCustomerDeletionBlocker({
      _count: { quotes: 1, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
    });
    expect(blocker).toEqual({
      canDelete: false,
      reason: "No se puede eliminar: tiene 1 cotización asociada",
    });
  });

  it("blocks deletion with plural quote reason when customer has multiple quotes", () => {
    const blocker = getCustomerDeletionBlocker({
      _count: { quotes: 3, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
    });
    expect(blocker).toEqual({
      canDelete: false,
      reason: "No se puede eliminar: tiene 3 cotizaciones asociadas",
    });
  });

  it("blocks deletion with financial activity reason when customer has payments or ledger entries", () => {
    const paymentBlocker = getCustomerDeletionBlocker({
      _count: { quotes: 0, payments: 1, paymentRequests: 0, ledgerEntries: 0 },
    });
    expect(paymentBlocker).toEqual({
      canDelete: false,
      reason: "No se puede eliminar: tiene actividad financiera asociada",
    });

    const ledgerBlocker = getCustomerDeletionBlocker({
      _count: { quotes: 0, payments: 0, paymentRequests: 0, ledgerEntries: 2 },
    });
    expect(ledgerBlocker).toEqual({
      canDelete: false,
      reason: "No se puede eliminar: tiene actividad financiera asociada",
    });
  });
});

describe("getCustomerAccountStatement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { totalCents: 25000, settlementAgreement: null },
    ]);
    (prisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: 17500 } });
    (prisma.paymentApplication.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: 17500 } });
    (prisma.ledgerEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "ledger-1",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
        type: "CREDIT",
        movementType: "PAYMENT_CAPTURE",
        amountCents: 5000,
        resultingBalanceCents: 20000,
        actor: null,
        reason: null,
        payment: { id: "p-1", method: "CASH", amountCents: 5000, operationKey: "op-1", reversedAt: null, quote: { id: "quote-1", number: "COT-001" } },
        paymentApplication: null,
        workOrder: null,
      },
      {
        id: "ledger-2",
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
        type: "CREDIT",
        movementType: "PAYMENT_CAPTURE",
        amountCents: 12500,
        resultingBalanceCents: 7500,
        actor: null,
        reason: null,
        payment: { id: "p-2", method: "TRANSFER", amountCents: 12500, operationKey: "op-2", reversedAt: null, quote: { id: "quote-2", number: "COT-002" } },
        paymentApplication: null,
        workOrder: null,
      },
    ]);
  });

  it("uses approved quotes with completed work orders and confirmed payments for the accumulated balance", async () => {
    const statement = await getCustomerAccountStatement("customer-1");

    expect(prisma.quote.findMany).toHaveBeenCalledWith({
      where: {
        customerId: "customer-1",
        status: "APPROVED",
        workOrder: { status: WorkOrderStatus.COMPLETED },
      },
      select: { subtotalCents: true, taxCents: true, totalCents: true, settlementAgreement: true },
    });
    expect(prisma.payment.aggregate).toHaveBeenCalledWith({
      where: {
        customerId: "customer-1",
        status: "PAID",
        reversedAt: null,
      },
      _sum: { amountCents: true },
    });
    expect(statement).toMatchObject({
      nominalContractedCents: 25000,
      totalContractedCents: 25000,
      totalPaidCents: 17500,
      pendingBalanceCents: 7500,
      availableCreditCents: 0,
    });
  });

  it("preserves the existing administrative authorization before reading the financial statement", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(getCustomerAccountStatement("customer-1")).rejects.toThrow("Unauthorized");

    expect(prisma.quote.findMany).not.toHaveBeenCalled();
    expect(prisma.payment.aggregate).not.toHaveBeenCalled();
    expect(prisma.ledgerEntry.findMany).not.toHaveBeenCalled();
  });

  it("returns ledger movements chronologically with their reference, method, amount, and resulting balance", async () => {
    const statement = await getCustomerAccountStatement("customer-1");

    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith({
      where: { customerId: "customer-1" },
      include: expect.objectContaining({
        actor: { select: { id: true, displayName: true } },
        payment: {
          select: {
            id: true,
            method: true,
            amountCents: true,
            operationKey: true,
            reversedAt: true,
            quote: { select: { id: true, number: true } },
          },
        },
      }),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(statement.movements).toEqual([
      expect.objectContaining({
        payment: expect.objectContaining({ method: "TRANSFER", quote: { id: "quote-2", number: "COT-002" } }),
        amountCents: 12500,
        resultingBalanceCents: 7500,
      }),
      expect.objectContaining({
        payment: expect.objectContaining({ method: "CASH", quote: { id: "quote-1", number: "COT-001" } }),
        amountCents: 5000,
        resultingBalanceCents: 20000,
      }),
    ]);
  });

  it("keeps statement totals active-only and surfaces correction history movements", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { totalCents: 10000, settlementAgreement: null },
    ]);
    // Only the replacement capture counts as paid; original reversed capture is excluded.
    (prisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: 9000 } });
    (prisma.paymentApplication.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: 9000 } });
    (prisma.ledgerEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "ledger-charge",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
        type: "DEBIT",
        movementType: "NOTE_CHARGE",
        amountCents: 10000,
        resultingBalanceCents: 10000,
        actor: null,
        reason: null,
        payment: null,
        paymentApplication: null,
        workOrder: { id: "wo-1", number: "OT-001", status: "COMPLETED" },
      },
      {
        id: "ledger-original-capture",
        createdAt: new Date("2026-08-02T10:00:00.000Z"),
        type: "CREDIT",
        movementType: "PAYMENT_CAPTURE",
        amountCents: 10000,
        resultingBalanceCents: 0,
        actor: null,
        reason: null,
        payment: { id: "p-1", method: "CASH", amountCents: 10000, operationKey: "op-original", reversedAt: new Date("2026-08-03T10:00:00.000Z"), quote: { id: "quote-1", number: "COT-001" } },
        paymentApplication: null,
        workOrder: null,
      },
      {
        id: "ledger-reversal",
        createdAt: new Date("2026-08-03T10:00:00.000Z"),
        type: "DEBIT",
        movementType: "PAYMENT_REVERSAL",
        amountCents: 10000,
        resultingBalanceCents: 10000,
        actor: { id: "admin-1", displayName: "Admin User" },
        reason: "Wrong method recorded",
        payment: { id: "p-1", method: "CASH", amountCents: 10000, operationKey: "op-original", reversedAt: new Date("2026-08-03T10:00:00.000Z"), quote: { id: "quote-1", number: "COT-001" } },
        paymentApplication: null,
        workOrder: null,
      },
      {
        id: "ledger-replacement-capture",
        createdAt: new Date("2026-08-03T10:00:01.000Z"),
        type: "CREDIT",
        movementType: "PAYMENT_CAPTURE",
        amountCents: 9000,
        resultingBalanceCents: 1000,
        actor: { id: "admin-1", displayName: "Admin User" },
        reason: "Wrong method recorded",
        payment: { id: "p-2", method: "TRANSFER", amountCents: 9000, operationKey: "op-replacement", reversedAt: null, quote: { id: "quote-1", number: "COT-001" } },
        paymentApplication: null,
        workOrder: null,
      },
    ]);

    const statement = await getCustomerAccountStatement("customer-1");

    expect(statement.totalContractedCents).toBe(10000);
    expect(statement.totalPaidCents).toBe(9000);
    expect(statement.pendingBalanceCents).toBe(1000);
    const movementTypes = statement.movements.map((m) => m.movementType);
    expect(movementTypes).toContain("PAYMENT_REVERSAL");
    expect(movementTypes).toContain("PAYMENT_CAPTURE");
    const reversal = statement.movements.find((m) => m.movementType === "PAYMENT_REVERSAL");
    expect(reversal?.reason).toBe("Wrong method recorded");
    expect(reversal?.actor?.displayName).toBe("Admin User");
  });

  it("allows an account with no approved quotes or movements", async () => {
    (prisma.quote.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: null } });
    (prisma.paymentApplication.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: null } });
    (prisma.ledgerEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(getCustomerAccountStatement("customer-1")).resolves.toEqual({
      nominalContractedCents: 0,
      totalContractedCents: 0,
      totalPaidCents: 0,
      pendingBalanceCents: 0,
      availableCreditCents: 0,
      movements: [],
    });
  });
});
