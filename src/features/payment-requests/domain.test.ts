// @vitest-environment node

import { PaymentRequestStatus } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  cancelPaymentRequest,
  createPaymentRequestForQuote,
  createPaymentRequestForWorkOrder,
  getOrCreatePaymentRequestForQuote,
  getPaymentRequestByToken,
  PaymentRequestAlreadyExistsError,
  PaymentRequestCancelledError,
  PaymentRequestExpiredError,
  PaymentRequestNotFoundError,
  savePaymentRequestFiscalData,
  setPaymentRequestInvoicePreference,
} from "./domain";

let testCustomerId = "";
let testFiscalProfileId = "";
const createdPaymentRequestIds: string[] = [];
const createdWorkOrderIds: string[] = [];
const createdQuoteIds: string[] = [];
const createdFiscalProfileIds: string[] = [];

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

  if (createdFiscalProfileIds.length > 0) {
    await prisma.customerFiscalProfile.deleteMany({
      where: { id: { in: createdFiscalProfileIds } },
    });
    createdFiscalProfileIds.length = 0;
  }

  if (testFiscalProfileId) {
    await prisma.customerFiscalProfile.deleteMany({
      where: { id: testFiscalProfileId },
    });
    testFiscalProfileId = "";
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

  it("sets FISCAL_DATA_REQUIRED when invoice is required at creation", async () => {
    const quote = await createTestQuote(testCustomerId);

    const request = await createPaymentRequestForQuote(quote.id, true);
    createdPaymentRequestIds.push(request.id);

    expect(request.status).toBe(PaymentRequestStatus.FISCAL_DATA_REQUIRED);
    expect(request.requiresInvoice).toBe(true);
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

describe("getOrCreatePaymentRequestForQuote", () => {
  it("creates a payment request when none exists", async () => {
    const quote = await createTestQuote(testCustomerId);

    const request = await getOrCreatePaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(request.id);

    expect(request.customerId).toBe(testCustomerId);
    expect(request.quoteId).toBe(quote.id);
    expect(request.status).toBe(PaymentRequestStatus.PENDING);
    expect(request.token).toHaveLength(64);
    expect(request.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("reuses the same active request on subsequent calls", async () => {
    const quote = await createTestQuote(testCustomerId);

    const first = await getOrCreatePaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(first.id);

    const second = await getOrCreatePaymentRequestForQuote(quote.id);

    expect(second.id).toBe(first.id);
    expect(second.token).toBe(first.token);
  });

  it("creates a new request after the active one is cancelled", async () => {
    const quote = await createTestQuote(testCustomerId);

    const first = await getOrCreatePaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(first.id);

    await cancelPaymentRequest(first.id);

    const second = await getOrCreatePaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(second.id);

    expect(second.id).not.toBe(first.id);
    expect(second.token).not.toBe(first.token);
  });

  it("sets FISCAL_DATA_REQUIRED when invoice is required at creation", async () => {
    const quote = await createTestQuote(testCustomerId);

    const request = await getOrCreatePaymentRequestForQuote(quote.id, true);
    createdPaymentRequestIds.push(request.id);

    expect(request.status).toBe(PaymentRequestStatus.FISCAL_DATA_REQUIRED);
    expect(request.requiresInvoice).toBe(true);
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

describe("setPaymentRequestInvoicePreference", () => {
  it("transitions to FISCAL_DATA_REQUIRED when invoice is required", async () => {
    const quote = await createTestQuote(testCustomerId);
    const request = await createPaymentRequestForQuote(quote.id);
    createdPaymentRequestIds.push(request.id);

    const updated = await setPaymentRequestInvoicePreference(request.token, {
      requiresInvoice: true,
    });

    expect(updated.requiresInvoice).toBe(true);
    expect(updated.status).toBe(PaymentRequestStatus.FISCAL_DATA_REQUIRED);
  }, 10_000);

  it("transitions to READY_TO_PAY when invoice is not required", async () => {
    const quote = await createTestQuote(testCustomerId);
    const request = await createPaymentRequestForQuote(quote.id, true);
    createdPaymentRequestIds.push(request.id);

    const updated = await setPaymentRequestInvoicePreference(request.token, {
      requiresInvoice: false,
    });

    expect(updated.requiresInvoice).toBe(false);
    expect(updated.status).toBe(PaymentRequestStatus.READY_TO_PAY);
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

describe("savePaymentRequestFiscalData", () => {
  it(
    "creates a customer fiscal profile and snapshots data into the request",
    async () => {
    const quote = await createTestQuote(testCustomerId);
    const request = await createPaymentRequestForQuote(quote.id, true);
    createdPaymentRequestIds.push(request.id);

    const fiscalData = {
      personType: "BUSINESS" as const,
      businessName: "Test Business S.A. de C.V.",
      taxId: "TEST123456789",
      taxRegime: "601",
      cfdiUse: "G03",
      zipCode: "01000",
      address: "Test Address 123",
      email: "test@example.com",
      phone: "5551234567",
    };

    const updated = await savePaymentRequestFiscalData(request.token, fiscalData);

    expect(updated.customerFiscalProfile).not.toBeNull();
    expect(updated.customerFiscalProfile?.personType).toBe(fiscalData.personType);
    expect(updated.customerFiscalProfile?.businessName).toBe(fiscalData.businessName);
    expect(updated.customerFiscalProfile?.taxId).toBe(fiscalData.taxId);
    expect(updated.customerFiscalProfile?.taxRegime).toBe(fiscalData.taxRegime);
    expect(updated.customerFiscalProfile?.cfdiUse).toBe(fiscalData.cfdiUse);
    expect(updated.fiscalSnapshot).toMatchObject({
      personType: fiscalData.personType,
      businessName: fiscalData.businessName,
      taxId: fiscalData.taxId,
      taxRegime: fiscalData.taxRegime,
      cfdiUse: fiscalData.cfdiUse,
      zipCode: fiscalData.zipCode,
      address: fiscalData.address,
      email: fiscalData.email,
      phone: fiscalData.phone,
    });
    expect(updated.status).toBe(PaymentRequestStatus.READY_TO_PAY);

    if (updated.customerFiscalProfile) {
      createdFiscalProfileIds.push(updated.customerFiscalProfile.id);
    }
  }, 10000);

  it("reuses an existing fiscal profile for the same customer and taxId", async () => {
    const quote = await createTestQuote(testCustomerId);
    const request = await createPaymentRequestForQuote(quote.id, true);
    createdPaymentRequestIds.push(request.id);

    const fiscalData = {
      personType: "INDIVIDUAL" as const,
      businessName: "First Name",
      taxId: "REUSE123",
    };

    const first = await savePaymentRequestFiscalData(request.token, fiscalData);
    if (first.customerFiscalProfile) {
      createdFiscalProfileIds.push(first.customerFiscalProfile.id);
    }

    await cancelPaymentRequest(request.id);

    const secondRequest = await createPaymentRequestForQuote(quote.id, true);
    createdPaymentRequestIds.push(secondRequest.id);

    const second = await savePaymentRequestFiscalData(secondRequest.token, {
      ...fiscalData,
      personType: "BUSINESS" as const,
      businessName: "Updated Name",
      taxRegime: "601",
    });

    expect(second.customerFiscalProfile?.id).toBe(first.customerFiscalProfile?.id);
    expect(second.customerFiscalProfile?.personType).toBe("BUSINESS");
    expect(second.customerFiscalProfile?.businessName).toBe("Updated Name");
    expect(second.customerFiscalProfile?.taxRegime).toBe("601");
  }, 10000);
});
