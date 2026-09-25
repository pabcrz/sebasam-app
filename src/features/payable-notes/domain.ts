import {
  LedgerEntryType,
  LedgerMovementType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import type { PayableNoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withHistoricalBalances, type NotePaymentHistoryItem } from "@/features/payments/lib/payment-register";
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";

export class PayableNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayableNoteError";
  }
}

export type PayableNoteReadModel = {
  id: string;
  customerId: string | null;
  quoteId: string | null;
  workOrderId: string | null;
  referenceNumber: string;
  title: string;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  status: PayableNoteStatus;
  issuedAt: Date | null;
  paymentDueDate: Date | null;
};

type CreateStandalonePayableNoteInput = {
  customerId: string;
  referenceNumber: string;
  title: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paymentDueDate?: Date | null;
};

type RecordPayableNotePaymentInput = {
  payableNoteId: string;
  amountCents: number;
  operationKey: string;
  method?: PaymentMethod;
  actorId?: string;
};

function assertPositiveCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PayableNoteError(`${label} must be a positive integer amount in cents.`);
  }
}

export async function getPayableNoteReadModel(
  client: Pick<Prisma.TransactionClient, "payableNote" | "paymentApplication">,
  payableNoteId: string,
): Promise<PayableNoteReadModel> {
  const note = await client.payableNote.findUnique({
    where: { id: payableNoteId },
    select: {
      id: true,
      customerId: true,
      quoteId: true,
      workOrderId: true,
      referenceNumber: true,
      title: true,
      totalCents: true,
      status: true,
      issuedAt: true,
      paymentDueDate: true,
      quote: {
        select: {
          subtotalCents: true,
          discountCents: true,
          taxCents: true,
          totalCents: true,
          taxEnabled: true,
          items: { select: { quantity: true, unitPriceCents: true } },
          settlementAgreement: {
            select: {
              id: true,
              status: true,
              settlementBaseCents: true,
              settlementTaxCents: true,
              settlementTotalCents: true,
            },
          },
        },
      },
    },
  });

  if (!note) throw new PayableNoteError("The payable note does not exist.");

  const applications = await client.paymentApplication.aggregate({
    where: {
      payableNoteId,
      reversedAt: null,
      payment: { status: PaymentStatus.PAID, reversedAt: null },
    },
    _sum: { amountCents: true },
  });
  const paidCents = applications._sum.amountCents ?? 0;

  const totalCents = note.quote && note.workOrderId
    ? getEffectiveSettlementTotals(note.quote, note.quote.settlementAgreement).totalCents
    : note.totalCents;

  return {
    ...note,
    totalCents,
    paidCents,
    remainingCents: Math.max(0, totalCents - paidCents),
  };
}

export async function createStandalonePayableNote(input: CreateStandalonePayableNoteInput) {
  assertPositiveCents(input.totalCents, "Total");
  if (input.subtotalCents < 0 || input.taxCents < 0 || input.subtotalCents + input.taxCents !== input.totalCents) {
    throw new PayableNoteError("The payable note totals are inconsistent.");
  }
  if (!input.customerId || !input.referenceNumber.trim() || !input.title.trim()) {
    throw new PayableNoteError("Customer, reference number, and title are required.");
  }

  return prisma.payableNote.create({
    data: {
      customerId: input.customerId,
      referenceNumber: input.referenceNumber.trim(),
      title: input.title.trim(),
      subtotalCents: input.subtotalCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      status: "ISSUED",
      issuedAt: new Date(),
      paymentDueDate: input.paymentDueDate ?? null,
    },
  });
}

export async function getPayableNotePaymentHistory(payableNoteId: string): Promise<{
  note: PayableNoteReadModel;
  payments: NotePaymentHistoryItem[];
}> {
  const note = await getPayableNoteReadModel(prisma, payableNoteId);
  const payments = await prisma.payment.findMany({
    where: { applications: { some: { payableNoteId } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      amountCents: true,
      createdAt: true,
      method: true,
      status: true,
      reversedAt: true,
      correctionsReplacement: { select: { id: true } },
      applications: {
        where: { payableNoteId },
        select: { amountCents: true, reversedAt: true },
      },
    },
  });

  const history = payments.map((payment) => ({
    id: payment.id,
    paymentId: payment.id,
    date: payment.createdAt,
    method: payment.method,
    paymentStatus: payment.status,
    amountCents: payment.amountCents,
    appliedCents: payment.reversedAt || payment.status !== PaymentStatus.PAID
      ? 0
      : payment.applications.filter((application) => application.reversedAt === null).reduce((sum, application) => sum + application.amountCents, 0),
    paidCentsAtPayment: 0,
    remainingCentsAtPayment: 0,
    isReversed: payment.reversedAt !== null,
    isCorrected: payment.correctionsReplacement.length > 0,
  }));

  return { note, payments: withHistoricalBalances(note.totalCents, history) };
}

export async function recordPayableNotePayment(input: RecordPayableNotePaymentInput) {
  assertPositiveCents(input.amountCents, "Payment");
  if (!input.operationKey.trim()) throw new PayableNoteError("An operation key is required.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { operationKey: input.operationKey },
      include: { applications: { where: { payableNoteId: input.payableNoteId, reversedAt: null } } },
    });
    if (existing) {
      const note = await getPayableNoteReadModel(tx, input.payableNoteId);
      return { payment: existing, appliedCents: existing.applications[0]?.amountCents ?? 0, note };
    }

    const note = await getPayableNoteReadModel(tx, input.payableNoteId);
    if (note.status !== "ISSUED") {
      throw new PayableNoteError("Payments can only be registered for issued notes.");
    }
    if (!note.customerId) throw new PayableNoteError("The payable note has no customer.");
    const payment = await tx.payment.create({
      data: {
        operationKey: input.operationKey,
        customerId: note.customerId,
        quoteId: note.quoteId,
        payableNoteId: note.id,
        method: input.method ?? PaymentMethod.CASH,
        amountCents: input.amountCents,
        status: PaymentStatus.PAID,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        customerId: note.customerId,
        type: LedgerEntryType.CREDIT,
        movementType: LedgerMovementType.PAYMENT_CAPTURE,
        amountCents: input.amountCents,
        paymentId: payment.id,
        payableNoteId: note.id,
        workOrderId: note.workOrderId,
        actorId: input.actorId ?? null,
      },
    });

    const appliedCents = Math.min(input.amountCents, note.remainingCents);
    if (appliedCents > 0) {
      const application = await tx.paymentApplication.create({
        data: {
          operationKey: `${input.operationKey}:application`,
          paymentId: payment.id,
          workOrderId: note.workOrderId,
          payableNoteId: note.id,
          amountCents: appliedCents,
          actorId: input.actorId ?? null,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          customerId: note.customerId,
          type: LedgerEntryType.CREDIT,
          movementType: LedgerMovementType.PAYMENT_APPLICATION,
          amountCents: appliedCents,
          paymentId: payment.id,
          paymentApplicationId: application.id,
          workOrderId: note.workOrderId,
          payableNoteId: note.id,
          actorId: input.actorId ?? null,
        },
      });
    }

    return {
      payment,
      appliedCents,
      note: { ...note, paidCents: note.paidCents + appliedCents, remainingCents: note.remainingCents - appliedCents },
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function correctPayableNotePayment(input: {
  originalPaymentId: string;
  amountCents: number;
  method: PaymentMethod;
  reason: string;
  operationKey: string;
  actorId: string;
}) {
  assertPositiveCents(input.amountCents, "Correction");
  if (!input.reason.trim() || !input.operationKey.trim() || !input.actorId.trim()) {
    throw new PayableNoteError("Reason, operation key, and actor are required.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentCorrection.findUnique({ where: { operationKey: input.operationKey } });
    if (existing) return existing;

    const original = await tx.payment.findUnique({
      where: { id: input.originalPaymentId },
      include: { applications: { where: { reversedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    });
    if (!original || original.reversedAt) throw new PayableNoteError("The original payment is not available for correction.");
    if (original.applications.some((application) => !application.payableNoteId)) {
      throw new PayableNoteError("The original payment has an application without a payable note.");
    }

    const now = new Date();
    const reason = input.reason.trim();
    await tx.payment.update({
      where: { id: original.id },
      data: { reversedAt: now, reversalReason: reason, reversedById: input.actorId },
    });
    for (const application of original.applications) {
      await tx.paymentApplication.update({
        where: { id: application.id },
        data: { reversedAt: now, reversalReason: reason, reversedById: input.actorId },
      });
      await tx.ledgerEntry.create({
        data: {
          customerId: original.customerId,
          type: LedgerEntryType.DEBIT,
          movementType: LedgerMovementType.APPLICATION_REVERSAL,
          amountCents: application.amountCents,
          paymentId: original.id,
          paymentApplicationId: application.id,
          workOrderId: application.workOrderId,
          payableNoteId: application.payableNoteId,
          actorId: input.actorId,
          reason,
        },
      });
    }
    await tx.ledgerEntry.create({
      data: {
        customerId: original.customerId,
        type: LedgerEntryType.DEBIT,
        movementType: LedgerMovementType.PAYMENT_REVERSAL,
        amountCents: original.amountCents,
        paymentId: original.id,
        payableNoteId: original.payableNoteId,
        actorId: input.actorId,
        reason,
      },
    });

    const replacement = await tx.payment.create({
      data: {
        operationKey: `${input.operationKey}:payment`,
        customerId: original.customerId,
        quoteId: original.quoteId,
        payableNoteId: original.payableNoteId,
        paymentRequestId: original.paymentRequestId,
        method: input.method,
        amountCents: input.amountCents,
        status: PaymentStatus.PAID,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        customerId: original.customerId,
        type: LedgerEntryType.CREDIT,
        movementType: LedgerMovementType.PAYMENT_CAPTURE,
        amountCents: replacement.amountCents,
        paymentId: replacement.id,
        payableNoteId: replacement.payableNoteId,
        actorId: input.actorId,
        reason,
      },
    });
    const correction = await tx.paymentCorrection.create({
      data: {
        operationKey: input.operationKey,
        originalPaymentId: original.id,
        replacementPaymentId: replacement.id,
        reason,
        actorId: input.actorId,
      },
    });

    let remainingCents = replacement.amountCents;
    for (const [index, application] of original.applications.entries()) {
      const note = await getPayableNoteReadModel(tx, application.payableNoteId);
      const replacementAmountCents = Math.min(application.amountCents, remainingCents, note.remainingCents);
      let replacementApplicationId: string | null = null;
      if (replacementAmountCents > 0) {
        const replacementApplication = await tx.paymentApplication.create({
          data: {
            operationKey: `${input.operationKey}:application:${index}`,
            paymentId: replacement.id,
            workOrderId: application.workOrderId,
            payableNoteId: application.payableNoteId,
            amountCents: replacementAmountCents,
            actorId: input.actorId,
          },
        });
        replacementApplicationId = replacementApplication.id;
        remainingCents -= replacementAmountCents;
        await tx.ledgerEntry.create({
          data: {
            customerId: original.customerId,
            type: LedgerEntryType.CREDIT,
            movementType: LedgerMovementType.PAYMENT_APPLICATION,
            amountCents: replacementAmountCents,
            paymentId: replacement.id,
            paymentApplicationId: replacementApplication.id,
            workOrderId: application.workOrderId,
            payableNoteId: application.payableNoteId,
            actorId: input.actorId,
            reason,
          },
        });
      }
      await tx.paymentCorrectionApplication.create({
        data: {
          paymentCorrectionId: correction.id,
          originalApplicationId: application.id,
          replacementApplicationId,
          workOrderId: application.workOrderId,
          payableNoteId: application.payableNoteId,
          originalAmountCents: application.amountCents,
          replacementAmountCents,
          shortfallCents: application.amountCents - replacementAmountCents,
          sortOrder: index,
        },
      });
    }
    return correction;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
