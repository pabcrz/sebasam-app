// @vitest-environment node

import { PaymentRequestStatus } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  cancelPaymentRequest,
  createPaymentRequestForQuote,
  createPaymentRequestForWorkOrder,
  getPaymentRequestByToken,
  PaymentRequestAlreadyExistsError,
  PaymentRequestCancelledError,
  PaymentRequestExpiredError,
  PaymentRequestNotFoundError,
} from "./domain";

let testCustomerId = "";
const createdPaymentRequestIds: string[] = [];
const createdWorkOrderIds: string[] = [];
const createdQuoteIds: string[] = [];

async function createTestCustomer() {
  const customer = await prisma.customer.create({
    data: { name: "Test Payment Customer" },
  });
  testCustomerId = customer.id;
  return customer;
}

async function createTestQuote(customerId: string) {
  const quote = await prisma.quote.create({
    data: {
      customerId,
      number: `Q-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: "Test Quote",
    },
  });
  createdQuoteIds.push(quote.id);
  return quote;
}

async function createTestWorkOrder(quoteId: string) {
  const workOrder = await prisma.workOrder.create({
    data: {
      quoteId,
      number: `WO-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    },
  });
  createdWorkOrderIds.push(workOrder.id);
  return workOrder;
}

async function cleanup() {
  if (createdPaymentRequestIds.length > 0) {
    await prisma.paymentRequest.deleteMany({
      where: { id: { in: createdPaymentRequestIds } },
    });
    createdPaymentRequestIds.length = 0;
  }

  if (createdWorkOrderIds.length > 0) {
    await prisma.workOrder.deleteMany({
      where: { id: { in: createdWorkOrderIds } },
    });
    createdWorkOrderIds.length = 0;
  }

  if (createdQuoteIds.length > 0) {
    await prisma.quote.deleteMany({
      where: { id: { in: createdQuoteIds } },
    });
    createdQuoteIds.length = 0;
  }

  if (testCustomerId) {
    await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
    testCustomerId = "";
  }
}

beforeEach(async () => {
  await cleanup();
  await createTestCustomer();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("createPaymentRequestForQuote", () => {
  it("creates a payment request linked to a quote and customer", async () => {
    const quote = await createTestQuote(testCustomerId);

    const request = await createPaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(request.id);

    expect(request.customerId).toBe(testCustomerId);
    expect(request.quoteId).toBe(quote.id);
    expect(request.workOrderId).toBeNull();
    expect(request.status).toBe(PaymentRequestStatus.PENDING);
    expect(request.token).toHaveLength(64);
    expect(request.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("prevents duplicate active requests for the same quote", async () => {
    const quote = await createTestQuote(testCustomerId);

    const first = await createPaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(first.id);

    await expect(createPaymentRequestForQuote(quote.id)).rejects.toThrow(
      PaymentRequestAlreadyExistsError,
    );
  });
});

describe("createPaymentRequestForWorkOrder", () => {
  it("creates a payment request linked to a work order and customer", async () => {
    const quote = await createTestQuote(testCustomerId);
    const workOrder = await createTestWorkOrder(quote.id);

    const request = await createPaymentRequestForWorkOrder(workOrder.id);
    createdPaymentRequestIds.push(request.id);

    expect(request.customerId).toBe(testCustomerId);
    expect(request.workOrderId).toBe(workOrder.id);
    expect(request.quoteId).toBeNull();
    expect(request.status).toBe(PaymentRequestStatus.PENDING);
  });

  it("prevents duplicate active requests for the same work order", async () => {
    const quote = await createTestQuote(testCustomerId);
    const workOrder = await createTestWorkOrder(quote.id);

    const first = await createPaymentRequestForWorkOrder(workOrder.id);
    createdPaymentRequestIds.push(first.id);

    await expect(createPaymentRequestForWorkOrder(workOrder.id)).rejects.toThrow(
      PaymentRequestAlreadyExistsError,
    );
  });
});

describe("getPaymentRequestByToken", () => {
  it("returns the request and marks PENDING as VIEWED", async () => {
    const quote = await createTestQuote(testCustomerId);
    const created = await createPaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(created.id);

    const request = await getPaymentRequestByToken(created.token);

    expect(request.id).toBe(created.id);
    expect(request.status).toBe(PaymentRequestStatus.VIEWED);
    expect(request.viewedAt).not.toBeNull();
  });

  it("throws NotFound for an invalid token", async () => {
    await expect(getPaymentRequestByToken("invalid-token")).rejects.toThrow(
      PaymentRequestNotFoundError,
    );
  });

  it("throws Expired when the request is past expiration", async () => {
    const quote = await createTestQuote(testCustomerId);
    const request = await prisma.paymentRequest.create({
      data: {
        token: `expired-token-${Date.now()}`,
        status: PaymentRequestStatus.PENDING,
        customerId: testCustomerId,
        quoteId: quote.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    createdPaymentRequestIds.push(request.id);

    await expect(getPaymentRequestByToken(request.token)).rejects.toThrow(
      PaymentRequestExpiredError,
    );

    const updated = await prisma.paymentRequest.findUnique({ where: { id: request.id } });
    expect(updated?.status).toBe(PaymentRequestStatus.EXPIRED);
  });

  it("throws Cancelled for a cancelled request", async () => {
    const quote = await createTestQuote(testCustomerId);
    const request = await createPaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(request.id);

    await cancelPaymentRequest(request.id);

    await expect(getPaymentRequestByToken(request.token)).rejects.toThrow(
      PaymentRequestCancelledError,
    );
  });
});

describe("database constraints", () => {
  it("rejects a customer-only payment request at the database level", async () => {
    await expect(
      prisma.paymentRequest.create({
        data: {
          token: `customer-only-${Date.now()}`,
          status: PaymentRequestStatus.PENDING,
          customerId: testCustomerId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    ).rejects.toThrow(/violates check constraint/);
  });
});
