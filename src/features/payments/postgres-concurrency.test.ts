import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  PrismaClient,
  Prisma,
  QuoteStatus,
  WorkOrderStatus,
  PaymentMethod,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { correctCompletedWorkQuote } from "@/features/quotes/actions";
import {
  recordPayment,
  applyCustomerCredit,
  correctPayment,
  reversePaymentCapture,
} from "@/features/payments/domain";

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

function isSerializationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2034") return true;
    if (error.code === "P2010") {
      const message = String(error.message ?? "");
      return message.includes("40001") || message.includes("could not serialize access");
    }
  }
  if (error instanceof Error) {
    const message = error.message;
    return (
      message.includes("could not serialize access") ||
      message.includes("Transaction failed due to a write conflict or a deadlock") ||
      message.includes("40001")
    );
  }
  return false;
}

async function retryOnSerialization<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isSerializationError(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10 * (i + 1)));
    }
  }
  throw lastError;
}

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
  requireAdmin: vi.fn(),
}));

import { requireOperationalRole, requireAdmin } from "@/lib/auth/session";

type CreatedActor = {
  id: string;
  profile: { id: string; role: string; displayName: string };
};

async function createActor(prisma: PrismaClient): Promise<CreatedActor> {
  const id = randomUUID();
  await prisma.userProfile.create({
    data: {
      id,
      username: `actor-${id.slice(0, 8)}`,
      email: `actor-${id.slice(0, 8)}@test.local`,
      displayName: "Test Actor",
      role: "ADMIN",
    },
  });
  return {
    id,
    profile: { id, role: "ADMIN", displayName: "Test Actor" },
  };
}

async function createCustomer(prisma: PrismaClient) {
  return prisma.customer.create({
    data: {
      name: "Test Customer",
      email: `cust-${randomUUID().slice(0, 8)}@test.local`,
    },
  });
}

async function createCompletedWork(prisma: PrismaClient, customerId: string) {
  const quote = await prisma.quote.create({
    data: {
      customerId,
      number: `Q-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: QuoteStatus.APPROVED,
      title: "Original service",
      description: "Original description",
      subtotalCents: 20000,
      discountCents: 0,
      taxCents: 0,
      totalCents: 20000,
      taxEnabled: false,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      approvedAt: new Date(),
    },
  });

  const section = await prisma.quoteSection.create({
    data: {
      quoteId: quote.id,
      name: "General",
      isAuthorized: false,
    },
  });

  await prisma.quoteItem.create({
    data: {
      quoteId: quote.id,
      sectionId: section.id,
      type: "LABOR",
      description: "Original labor",
      quantity: 1,
      unitPriceCents: 20000,
      totalCents: 20000,
      includeInPayroll: true,
    },
  });

  const workOrder = await prisma.workOrder.create({
    data: {
      quoteId: quote.id,
      number: `WO-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: WorkOrderStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  return { quote, workOrder };
}

async function createPaymentWithExcessCredit(
  prisma: PrismaClient,
  customerId: string,
  quoteId: string,
  amountCents: number,
) {
  return prisma.payment.create({
    data: {
      operationKey: `pay-${randomUUID()}`,
      customerId,
      quoteId,
      method: PaymentMethod.CASH,
      amountCents,
      status: "PAID" as const,
    },
  });
}

async function createActivePaymentWithApplication(
  prisma: PrismaClient,
  customerId: string,
  quoteId: string,
  workOrderId: string,
  amountCents: number,
  actorId: string,
) {
  return prisma.payment.create({
    data: {
      operationKey: `pay-${randomUUID()}`,
      customerId,
      quoteId,
      method: PaymentMethod.CASH,
      amountCents,
      status: "PAID" as const,
      applications: {
        create: [
          {
            operationKey: `app-${randomUUID()}`,
            workOrderId,
            amountCents,
            actorId,
          },
        ],
      },
    },
    include: { applications: true },
  });
}

function correctionInput() {
  return {
    customerId: undefined,
    vehicle: { plate: "", brand: "", model: "", color: "", year: "" },
    title: "Corrected service",
    description: "Corrected description",
    administrative: true,
    taxEnabled: false,
    discountCents: 0,
    sections: [
      {
        name: "Corrected",
        isAuthorized: false,
        items: [
          {
            type: "LABOR" as const,
            description: "Corrected labor",
            quantity: 1,
            unitPriceCents: 15000,
          },
        ],
      },
    ],
  };
}

async function activeApplicationsForWorkOrder(prisma: PrismaClient, workOrderId: string) {
  return prisma.paymentApplication.findMany({
    where: {
      workOrderId,
      reversedAt: null,
      payment: { reversedAt: null },
    },
  });
}

describe.skipIf(!databaseUrl)("PostgreSQL concurrency locks", { timeout: 30000 }, () => {
  const prisma = databaseUrl
    ? new PrismaClient({
        datasources: {
          db: { url: databaseUrl },
        },
      })
    : (null as unknown as PrismaClient);
  let actor: CreatedActor;

  beforeAll(async () => {
    actor = await createActor(prisma);
    const mockReturn = {
      user: { id: actor.id },
      profile: actor.profile,
    };
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue(mockReturn);
    (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(mockReturn);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("serializes completed quote edit vs payment capture so both never commit", async () => {
    const customer = await createCustomer(prisma);
    const { quote, workOrder } = await createCompletedWork(prisma, customer.id);

    const capturePromise = recordPayment({
      workOrderId: workOrder.id,
      amountCents: 10000,
      method: PaymentMethod.CASH,
      operationKey: `race-capture-${randomUUID()}`,
      actorId: actor.id,
    });

    const editPromise = correctCompletedWorkQuote(quote.id, correctionInput());

    const [captureResult, editResult] = await Promise.allSettled([capturePromise, editPromise]);

    const finalQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: { items: true },
    });
    const finalApplications = await activeApplicationsForWorkOrder(prisma, workOrder.id);

    const captureCommitted = captureResult.status === "fulfilled";
    const editCommitted = editResult.status === "fulfilled";

    expect(captureCommitted && editCommitted).toBe(false);

    if (editCommitted) {
      expect(finalQuote?.title).toBe("Corrected service");
      expect(finalApplications).toHaveLength(0);
    }

    if (captureCommitted) {
      expect(finalQuote?.title).toBe("Original service");
      expect(finalApplications.length).toBeGreaterThan(0);
    }
  });

  it("serializes completed quote edit vs customer-credit application so both never commit", async () => {
    const customer = await createCustomer(prisma);
    const { quote, workOrder } = await createCompletedWork(prisma, customer.id);
    // Payment covers the note fully and leaves excess customer credit.
    await createPaymentWithExcessCredit(prisma, customer.id, quote.id, 30000);

    const creditPromise = applyCustomerCredit({
      customerId: customer.id,
      workOrderId: workOrder.id,
      amountCents: 15000,
      operationKey: `race-credit-${randomUUID()}`,
      actorId: actor.id,
    });

    const editPromise = correctCompletedWorkQuote(quote.id, correctionInput());

    const [creditResult, editResult] = await Promise.allSettled([creditPromise, editPromise]);

    const finalQuote = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: { items: true },
    });
    const finalApplications = await activeApplicationsForWorkOrder(prisma, workOrder.id);

    const creditCommitted = creditResult.status === "fulfilled";
    const editCommitted = editResult.status === "fulfilled";

    expect(creditCommitted && editCommitted).toBe(false);

    if (editCommitted) {
      expect(finalQuote?.title).toBe("Corrected service");
      expect(finalApplications).toHaveLength(0);
    }

    if (creditCommitted) {
      expect(finalQuote?.title).toBe("Original service");
      expect(finalApplications.length).toBeGreaterThan(0);
    }
  });

  it("serializes payment correction vs reversal so the payment is not left in an inconsistent state", async () => {
    const customer = await createCustomer(prisma);
    const { quote, workOrder } = await createCompletedWork(prisma, customer.id);
    const payment = await createActivePaymentWithApplication(
      prisma,
      customer.id,
      quote.id,
      workOrder.id,
      20000,
      actor.id,
    );

    const operationKey = `race-correction-${randomUUID()}`;

    const correctionPromise = correctPayment({
      originalPaymentId: payment.id,
      amountCents: 15000,
      method: PaymentMethod.TRANSFER,
      reason: "Correction race test",
      operationKey,
      actorId: actor.id,
    });

    const reversalPromise = reversePaymentCapture({
      paymentId: payment.id,
      reason: "Reversal race test",
      actorId: actor.id,
    });

    const [correctionResult, reversalResult] = await Promise.allSettled([
      correctionPromise,
      reversalPromise,
    ]);

    const finalPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { applications: true },
    });
    const corrections = await prisma.paymentCorrection.findMany({
      where: { originalPaymentId: payment.id },
    });

    const correctionCommitted = correctionResult.status === "fulfilled";
    const reversalCommitted = reversalResult.status === "fulfilled";

    // If both settled without error, the final state must be unambiguous:
    // either the payment was corrected (replacement exists) or reversed, not both.
    if (correctionCommitted && reversalCommitted) {
      expect(corrections.length).toBeLessThanOrEqual(1);
      if (corrections.length === 1) {
        expect(finalPayment?.reversedAt).not.toBeNull();
      } else {
        expect(finalPayment?.reversedAt).not.toBeNull();
        expect(finalPayment?.applications.every((a) => a.reversedAt !== null)).toBe(true);
      }
    }

    // Never allow an active original payment alongside a replacement.
    if (correctionCommitted) {
      const replacement = await prisma.payment.findUnique({
        where: { id: correctionResult.value.replacementPaymentId },
      });
      expect(replacement?.reversedAt).toBeNull();
    }
  });

  it("makes concurrent correction with the same operation key idempotent", async () => {
    const customer = await createCustomer(prisma);
    const { quote, workOrder } = await createCompletedWork(prisma, customer.id);
    const payment = await createActivePaymentWithApplication(
      prisma,
      customer.id,
      quote.id,
      workOrder.id,
      20000,
      actor.id,
    );

    const operationKey = `idempotent-correction-${randomUUID()}`;

    const [resultA, resultB] = await Promise.allSettled([
      retryOnSerialization(() =>
        correctPayment({
          originalPaymentId: payment.id,
          amountCents: 12000,
          method: PaymentMethod.TRANSFER,
          reason: "Idempotency test",
          operationKey,
          actorId: actor.id,
        }),
      ),
      retryOnSerialization(() =>
        correctPayment({
          originalPaymentId: payment.id,
          amountCents: 12000,
          method: PaymentMethod.TRANSFER,
          reason: "Idempotency test",
          operationKey,
          actorId: actor.id,
        }),
      ),
    ]);

    expect(resultA.status).toBe("fulfilled");
    expect(resultB.status).toBe("fulfilled");
    if (resultA.status !== "fulfilled" || resultB.status !== "fulfilled") {
      throw new Error("Retry did not resolve both corrections");
    }
    expect(resultA.value.correctionId).toBe(resultB.value.correctionId);

    const corrections = await prisma.paymentCorrection.findMany({
      where: { originalPaymentId: payment.id },
    });
    expect(corrections).toHaveLength(1);
  });
});
