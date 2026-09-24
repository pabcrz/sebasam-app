import { LedgerMovementType, PaymentMethod, PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordPayableNotePayment } from "@/features/payable-notes/domain";

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
      quoteId: "quote-1",
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
