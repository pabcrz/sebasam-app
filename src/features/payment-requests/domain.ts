import crypto from "node:crypto";
import { PaymentRequestStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fiscalDataInputSchema, invoicePreferenceSchema } from "./schemas";

const ACTIVE_STATUSES: PaymentRequestStatus[] = [
  PaymentRequestStatus.PENDING,
  PaymentRequestStatus.VIEWED,
  PaymentRequestStatus.FISCAL_DATA_REQUIRED,
  PaymentRequestStatus.READY_TO_PAY,
];

const DEFAULT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class PaymentRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentRequestError";
  }
}

export class PaymentRequestNotFoundError extends PaymentRequestError {
  constructor() {
    super("Payment request not found.");
    this.name = "PaymentRequestNotFoundError";
  }
}

export class PaymentRequestExpiredError extends PaymentRequestError {
  constructor() {
    super("Payment request has expired.");
    this.name = "PaymentRequestExpiredError";
  }
}

export class PaymentRequestCancelledError extends PaymentRequestError {
  constructor() {
    super("Payment request has been cancelled.");
    this.name = "PaymentRequestCancelledError";
  }
}

export class PaymentRequestAlreadyExistsError extends PaymentRequestError {
  constructor(scope: string) {
    super(`An active payment request already exists for this ${scope}.`);
    this.name = "PaymentRequestAlreadyExistsError";
  }
}

export class PaymentRequestOperationError extends PaymentRequestError {
  constructor(message: string) {
    super(message);
    this.name = "PaymentRequestOperationError";
  }
}

export function createToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createExpirationDate(reference = new Date()): Date {
  return new Date(reference.getTime() + DEFAULT_TOKEN_TTL_MS);
}

function deriveStatusAfterInvoiceChange(
  requiresInvoice: boolean,
  hasFiscalSnapshot: boolean,
): PaymentRequestStatus {
  if (requiresInvoice && !hasFiscalSnapshot) {
    return PaymentRequestStatus.FISCAL_DATA_REQUIRED;
  }

  return PaymentRequestStatus.READY_TO_PAY;
}

type TransactionClient = Prisma.TransactionClient;

const defaultInclude = {
  customer: true,
  quote: { select: { id: true, number: true, totalCents: true } },
  workOrder: { select: { id: true, number: true } },
  customerFiscalProfile: true,
} as const;

export async function getPaymentRequestByToken(token: string) {
  const request = await prisma.paymentRequest.findUnique({
    where: { token },
    include: defaultInclude,
  });

  if (!request) {
    throw new PaymentRequestNotFoundError();
  }

  if (request.status === PaymentRequestStatus.CANCELLED) {
    throw new PaymentRequestCancelledError();
  }

  const now = new Date();

  if (request.status === PaymentRequestStatus.EXPIRED || request.expiresAt < now) {
    if (request.status !== PaymentRequestStatus.EXPIRED) {
      await prisma.paymentRequest.update({
        where: { id: request.id },
        data: { status: PaymentRequestStatus.EXPIRED },
      });
    }

    throw new PaymentRequestExpiredError();
  }

  if (request.status === PaymentRequestStatus.PENDING) {
    return prisma.paymentRequest.update({
      where: { id: request.id },
      data: { status: PaymentRequestStatus.VIEWED, viewedAt: now },
      include: defaultInclude,
    });
  }

  return request;
}

async function assertNoActiveRequest(
  tx: TransactionClient,
  where: { quoteId?: string; workOrderId?: string },
) {
  const existingActive = await tx.paymentRequest.findFirst({
    where: { ...where, status: { in: ACTIVE_STATUSES } },
  });

  if (existingActive) {
    const scope = where.quoteId ? "quote" : "work order";
    throw new PaymentRequestAlreadyExistsError(scope);
  }
}

export async function createPaymentRequestForQuote(
  quoteId: string,
  requiresInvoice = false,
) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { customer: true },
    });

    if (!quote) {
      throw new PaymentRequestOperationError("Quote not found.");
    }

    await assertNoActiveRequest(tx, { quoteId: quote.id });

    const initialStatus = requiresInvoice
      ? PaymentRequestStatus.FISCAL_DATA_REQUIRED
      : PaymentRequestStatus.PENDING;

    return tx.paymentRequest.create({
      data: {
        token: createToken(),
        status: initialStatus,
        customerId: quote.customerId,
        quoteId: quote.id,
        requiresInvoice,
        expiresAt: createExpirationDate(),
      },
    });
  });
}

export async function createPaymentRequestForWorkOrder(
  workOrderId: string,
  requiresInvoice = false,
) {
  return prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findUnique({
      where: { id: workOrderId },
      include: { quote: { include: { customer: true } } },
    });

    if (!workOrder) {
      throw new PaymentRequestOperationError("Work order not found.");
    }

    if (!workOrder.quote) {
      throw new PaymentRequestOperationError("Work order is not linked to a quote.");
    }

    await assertNoActiveRequest(tx, { workOrderId: workOrder.id });

    const initialStatus = requiresInvoice
      ? PaymentRequestStatus.FISCAL_DATA_REQUIRED
      : PaymentRequestStatus.PENDING;

    return tx.paymentRequest.create({
      data: {
        token: createToken(),
        status: initialStatus,
        customerId: workOrder.quote.customerId,
        workOrderId: workOrder.id,
        requiresInvoice,
        expiresAt: createExpirationDate(),
      },
    });
  });
}

export async function setPaymentRequestInvoicePreference(token: string, input: unknown) {
  const data = invoicePreferenceSchema.parse(input);
  const request = await getPaymentRequestByToken(token);

  if (request.status === PaymentRequestStatus.CANCELLED) {
    throw new PaymentRequestCancelledError();
  }

  const hasFiscalSnapshot = request.fiscalSnapshot !== null;
  const nextStatus = deriveStatusAfterInvoiceChange(data.requiresInvoice, hasFiscalSnapshot);

  return prisma.paymentRequest.update({
    where: { id: request.id },
    data: {
      requiresInvoice: data.requiresInvoice,
      status: nextStatus,
    },
  });
}

export async function savePaymentRequestFiscalData(token: string, input: unknown) {
  const data = fiscalDataInputSchema.parse(input);
  const request = await getPaymentRequestByToken(token);

  if (request.status === PaymentRequestStatus.CANCELLED) {
    throw new PaymentRequestCancelledError();
  }

  if (!request.customer) {
    throw new PaymentRequestOperationError("Payment request has no associated customer.");
  }

  const fiscalSnapshot = {
    personType: data.personType,
    businessName: data.businessName,
    taxId: data.taxId,
    taxRegime: data.taxRegime ?? null,
    cfdiUse: data.cfdiUse ?? null,
    zipCode: data.zipCode ?? null,
    address: data.address ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    capturedAt: new Date().toISOString(),
  };

  return prisma.$transaction(async (tx) => {
    const profile = await tx.customerFiscalProfile.upsert({
      where: { customerId_taxId: { customerId: request.customerId, taxId: data.taxId } },
      update: {
        personType: data.personType,
        businessName: data.businessName,
        taxRegime: data.taxRegime ?? null,
        cfdiUse: data.cfdiUse ?? null,
        zipCode: data.zipCode ?? null,
        address: data.address ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
      create: {
        customerId: request.customerId,
        personType: data.personType,
        businessName: data.businessName,
        taxId: data.taxId,
        taxRegime: data.taxRegime ?? null,
        cfdiUse: data.cfdiUse ?? null,
        zipCode: data.zipCode ?? null,
        address: data.address ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
    });

    const nextStatus = request.requiresInvoice
      ? PaymentRequestStatus.READY_TO_PAY
      : request.status;

    return tx.paymentRequest.update({
      where: { id: request.id },
      data: {
        customerFiscalProfileId: profile.id,
        fiscalSnapshot,
        status: nextStatus,
      },
      include: {
        customer: true,
        customerFiscalProfile: true,
      },
    });
  });
}

export async function cancelPaymentRequest(paymentRequestId: string) {
  return prisma.paymentRequest.update({
    where: { id: paymentRequestId },
    data: { status: PaymentRequestStatus.CANCELLED },
  });
}
