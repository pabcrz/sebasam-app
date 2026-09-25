import { LedgerMovementType, PaymentMethod, PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getPayableNoteReadModel, recordPayableNotePayment } from "@/features/payable-notes/domain";

const { tx } = vi.hoisted(() => {
  const tx = {
    payableNote: { findUnique: vi.fn() },
    paymentApplication: { aggregate: vi.fn(), create: vi.fn() },
    payment: { findUnique: vi.fn(), create: vi.fn() },
    ledgerEntry: { create: vi.fn() },
  };
  return { tx };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
  },
}));

describe("recordPayableNotePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.payableNote.findUnique.mockResolvedValue({
      id: "sale-note-1",
      customerId: "customer-1",
      quoteId: null,
      workOrderId: null,
      referenceNumber: "N-0926-01",
      title: "Standalone sale",
      totalCents: 1000,
      status: "ISSUED",
      issuedAt: new Date("2026-09-01T00:00:00.000Z"),
      paymentDueDate: null,
    });
    tx.paymentApplication.aggregate.mockResolvedValue({ _sum: { amountCents: 0 } });
    tx.payment.findUnique.mockResolvedValue(null);
    tx.payment.create.mockResolvedValue({ id: "payment-1" });
    tx.paymentApplication.create.mockResolvedValue({ id: "application-1" });
  });

  it("records payment and application ledger entries for a standalone SALE note", async () => {
    await recordPayableNotePayment({
      payableNoteId: "sale-note-1",
      amountCents: 500,
      operationKey: "sale-payment-1",
      method: PaymentMethod.CASH,
      actorId: "admin-1",
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        payableNoteId: "sale-note-1",
        customerId: "customer-1",
        status: PaymentStatus.PAID,
      }),
    });
    expect(tx.paymentApplication.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentId: "payment-1",
        workOrderId: null,
        payableNoteId: "sale-note-1",
        amountCents: 500,
      }),
    });
    expect(tx.ledgerEntry.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        movementType: LedgerMovementType.PAYMENT_CAPTURE,
        workOrderId: null,
        payableNoteId: "sale-note-1",
      }),
    });
    expect(tx.ledgerEntry.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        movementType: LedgerMovementType.PAYMENT_APPLICATION,
        workOrderId: null,
        payableNoteId: "sale-note-1",
      }),
    });
  });
});

describe("getPayableNoteReadModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.payableNote.findUnique.mockResolvedValue({
      id: "note-real-id",
      customerId: "customer-1",
      quoteId: "quote-1",
      workOrderId: "work-order-different-id",
      referenceNumber: "N-1",
      title: "Work note",
      totalCents: 9000,
      status: "ISSUED",
      issuedAt: null,
      paymentDueDate: null,
      quote: {
        subtotalCents: 10000,
        discountCents: 0,
        taxCents: 1600,
        totalCents: 11600,
        taxEnabled: true,
        items: [
          { quantity: 1, unitPriceCents: 4000 },
          { quantity: 1, unitPriceCents: null },
        ],
        settlementAgreement: null,
      },
    });
    tx.paymentApplication.aggregate.mockResolvedValue({ _sum: { amountCents: 1200 } });
  });

  it("recalculates WORK note totals from priced items, excludes pending prices, and subtracts active applications", async () => {
    const note = await getPayableNoteReadModel(tx as never, "note-real-id");

    expect(note.totalCents).toBe(4640);
    expect(note.paidCents).toBe(1200);
    expect(note.remainingCents).toBe(3440);
    expect(tx.paymentApplication.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ payableNoteId: "note-real-id" }),
    }));
  });

  it("uses the active settlement agreement total instead of recalculating quote items", async () => {
    tx.payableNote.findUnique.mockResolvedValueOnce({
      ...await tx.payableNote.findUnique(),
      quote: {
        subtotalCents: 10000,
        discountCents: 0,
        taxCents: 1600,
        totalCents: 11600,
        taxEnabled: true,
        items: [{ quantity: 1, unitPriceCents: 4000 }],
        settlementAgreement: {
          id: "agreement-1", status: "ACTIVE", settlementBaseCents: 2000,
          settlementTaxCents: 320, settlementTotalCents: 2320,
        },
      },
    });

    const note = await getPayableNoteReadModel(tx as never, "note-real-id");

    expect(note.totalCents).toBe(2320);
    expect(note.remainingCents).toBe(1120);
  });

  it("keeps a standalone SALE note's stored total without requiring quote or WorkOrder", async () => {
    tx.paymentApplication.aggregate.mockResolvedValueOnce({ _sum: { amountCents: 0 } });
    tx.payableNote.findUnique.mockResolvedValueOnce({
      id: "sale-note-id", customerId: "customer-1", quoteId: null, workOrderId: null,
      referenceNumber: "N-SALE", title: "Sale", totalCents: 1000, status: "ISSUED",
      issuedAt: null, paymentDueDate: null, quote: null,
    });

    const note = await getPayableNoteReadModel(tx as never, "sale-note-id");

    expect(note.totalCents).toBe(1000);
    expect(note.remainingCents).toBe(1000);
    expect(note.workOrderId).toBeNull();
  });
});
