import { PaymentMethod, PaymentStatus, QuoteStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { parseCashAmountCents, PaymentOperationError, recordCashPayment } from "./domain";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

type MockTx = {
  quote: { findUnique: ReturnType<typeof vi.fn> };
  paymentRequest: { findUnique: ReturnType<typeof vi.fn> };
  payment: {
    aggregate: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function mockTransaction(options: { totalCents?: number; paidCents?: number; status?: QuoteStatus } = {}) {
  const tx: MockTx = {
    quote: {
      findUnique: vi.fn().mockResolvedValue({
        id: "quote-1",
        totalCents: options.totalCents ?? 10000,
        status: options.status ?? QuoteStatus.APPROVED,
      }),
    },
    paymentRequest: { findUnique: vi.fn() },
    payment: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: options.paidCents ?? 0 } }),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: "payment-1",
        amountCents: data.amountCents,
        method: data.method,
        status: data.status,
      })),
    },
  };
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: (transaction: MockTx) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

describe("recordCashPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a paid cash payment linked to its quote", async () => {
    const tx = mockTransaction();

    const result = await recordCashPayment({
      quoteId: "quote-1",
      amountCents: 2500,
      operationKey: "payment-operation-1",
    });

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        operationKey: "payment-operation-1",
        quoteId: "quote-1",
        paymentRequestId: undefined,
        method: PaymentMethod.CASH,
        amountCents: 2500,
        status: PaymentStatus.PAID,
      },
      select: { id: true, amountCents: true, method: true, status: true },
    });
    expect(result).toMatchObject({ paidCents: 2500, remainingCents: 7500 });
  });

  it("settles the quote when the cash payment equals the remaining balance", async () => {
    mockTransaction({ totalCents: 10000, paidCents: 2500 });

    const result = await recordCashPayment({ quoteId: "quote-1", amountCents: 7500, operationKey: "payment-operation-1" });

    expect(result.paidCents).toBe(10000);
    expect(result.remainingCents).toBe(0);
  });

  it("keeps the exact remaining balance after a partial cash payment", async () => {
    mockTransaction({ totalCents: 10000, paidCents: 2500 });

    const result = await recordCashPayment({ quoteId: "quote-1", amountCents: 1250, operationKey: "payment-operation-1" });

    expect(result.paidCents).toBe(3750);
    expect(result.remainingCents).toBe(6250);
  });

  it("rejects overpayments before creating a payment", async () => {
    const tx = mockTransaction({ totalCents: 10000, paidCents: 8000 });

    await expect(recordCashPayment({ quoteId: "quote-1", amountCents: 2001, operationKey: "payment-operation-1" })).rejects.toThrow(
      "El pago no puede exceder el saldo pendiente.",
    );
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it("rejects a quote whose paid abonos already exceed its financial total", async () => {
    const tx = mockTransaction({ totalCents: 10000, paidCents: 10001 });

    await expect(recordCashPayment({ quoteId: "quote-1", amountCents: 1, operationKey: "payment-operation-1" })).rejects.toThrow(
      "Los pagos registrados exceden el total de la cotización.",
    );
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it("rejects invalid amounts with exact-cent validation", async () => {
    expect(() => parseCashAmountCents("0")).toThrow(PaymentOperationError);
    expect(() => parseCashAmountCents("10.999")).toThrow(PaymentOperationError);
    expect(() => parseCashAmountCents("abc")).toThrow(PaymentOperationError);
    expect(parseCashAmountCents("12.5")).toBe(1250);
  });

  it("links the payment to a quote payment request when one is supplied", async () => {
    const tx = mockTransaction();
    tx.paymentRequest.findUnique.mockResolvedValue({ quoteId: "quote-1" });

    await recordCashPayment({ paymentRequestId: "request-1", amountCents: 1000, operationKey: "payment-operation-1" });

    expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quoteId: "quote-1", paymentRequestId: "request-1" }),
    }));
  });

  it("returns the original payment and balance when a committed operation is retried", async () => {
    const tx = mockTransaction({ totalCents: 10000, paidCents: 2500 });
    tx.payment.findUnique.mockResolvedValue({
      id: "payment-1",
      quoteId: "quote-1",
      amountCents: 2500,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    });

    const result = await recordCashPayment({
      quoteId: "quote-1",
      amountCents: 2500,
      operationKey: "payment-operation-1",
    });

    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      payment: {
        id: "payment-1",
        amountCents: 2500,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
      },
      paidCents: 2500,
      remainingCents: 7500,
    });
  });
});
