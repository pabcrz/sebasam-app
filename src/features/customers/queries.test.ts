import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerAccountStatement, listCustomers } from "./queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findMany: vi.fn(), findUnique: vi.fn() },
    quote: { aggregate: vi.fn() },
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

  it("searches name, email, phone, address, notes and related vehicle plates", async () => {
    await listCustomers({ query: "ABC-123" });

    const call = getFindManyCall();
    expect(call.where).toEqual({
      OR: [
        { name: { contains: "ABC-123", mode: "insensitive" } },
        { email: { contains: "ABC-123", mode: "insensitive" } },
        { phone: { contains: "ABC-123", mode: "insensitive" } },
        { address: { contains: "ABC-123", mode: "insensitive" } },
        { notes: { contains: "ABC-123", mode: "insensitive" } },
        { vehicles: { some: { plate: { contains: "ABC-123", mode: "insensitive" } } } },
      ],
    });
  });

  it("limits results to 50 customers", async () => {
    await listCustomers();

    const call = getFindManyCall();
    expect(call.take).toBe(50);
  });
});

describe("getCustomerAccountStatement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (prisma.quote.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { totalCents: 25000 } });
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

  it("uses approved quotes and confirmed payments for the accumulated balance", async () => {
    const statement = await getCustomerAccountStatement("customer-1");

    expect(prisma.quote.aggregate).toHaveBeenCalledWith({
      where: { customerId: "customer-1", status: "APPROVED" },
      _sum: { totalCents: true },
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
      totalContractedCents: 25000,
      totalPaidCents: 17500,
      pendingBalanceCents: 7500,
      availableCreditCents: 0,
    });
  });

  it("preserves the existing administrative authorization before reading the financial statement", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(getCustomerAccountStatement("customer-1")).rejects.toThrow("Unauthorized");

    expect(prisma.quote.aggregate).not.toHaveBeenCalled();
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

  it("allows an account with no approved quotes or movements", async () => {
    (prisma.quote.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { totalCents: null } });
    (prisma.payment.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: null } });
    (prisma.paymentApplication.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({ _sum: { amountCents: null } });
    (prisma.ledgerEntry.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(getCustomerAccountStatement("customer-1")).resolves.toEqual({
      totalContractedCents: 0,
      totalPaidCents: 0,
      pendingBalanceCents: 0,
      availableCreditCents: 0,
      movements: [],
    });
  });
});
