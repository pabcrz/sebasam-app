import { PaymentMethod, PaymentStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { requireAdmin, requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getCustomerCreditSummary,
  getNoteFinancialSummary,
  type CustomerCreditSummary,
  type NoteFinancialSummary,
} from "./domain";
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";
import { withHistoricalBalances, type NotePaymentHistoryItem } from "./lib/payment-register";

export type NotePaymentHistory = {
  totalCents: number;
  payments: NotePaymentHistoryItem[];
};

export async function getNotePaymentHistory(workOrderIds: string[]): Promise<Map<string, NotePaymentHistory>> {
  await requireOperationalRole();
  if (workOrderIds.length === 0) return new Map();

  if (prisma.payableNote) {
    const requestedIds = [...new Set(workOrderIds)];
    const payableNotes = await prisma.payableNote.findMany({
      where: { OR: [{ id: { in: requestedIds } }, { workOrderId: { in: requestedIds } }] },
      select: {
        id: true,
        workOrderId: true,
        totalCents: true,
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
    const noteByRequestedId = new Map<string, (typeof payableNotes)[number]>();
    for (const note of payableNotes) {
      if (requestedIds.includes(note.id)) noteByRequestedId.set(note.id, note);
      if (note.workOrderId && requestedIds.includes(note.workOrderId)) noteByRequestedId.set(note.workOrderId, note);
    }
    const notes = [...new Set(noteByRequestedId.values())];
    if (notes.length === 0) return new Map();

    const noteIds = notes.map((note) => note.id);
    const payments = await prisma.payment.findMany({
      where: { applications: { some: { payableNoteId: { in: noteIds } } } },
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
          where: { payableNoteId: { in: noteIds } },
          select: { payableNoteId: true, amountCents: true, reversedAt: true },
        },
      },
    });
    const paymentsByNote = new Map(noteIds.map((id) => [id, [] as NotePaymentHistoryItem[]]));
    for (const payment of payments) {
      const activeApplicationsByNote = new Map<string, number>();
      for (const application of payment.applications) {
        if (!paymentsByNote.has(application.payableNoteId)) continue;
        const activeAmount = application.reversedAt === null ? application.amountCents : 0;
        activeApplicationsByNote.set(application.payableNoteId, (activeApplicationsByNote.get(application.payableNoteId) ?? 0) + activeAmount);
      }
      for (const [noteId, activeAppliedCents] of activeApplicationsByNote) {
        const history = paymentsByNote.get(noteId)!;
        const isReversed = Boolean(payment.reversedAt);
        history.push({
          id: payment.id,
          paymentId: payment.id,
          date: payment.createdAt,
          method: payment.method,
          paymentStatus: payment.status,
          amountCents: payment.amountCents,
          appliedCents: isReversed || payment.status !== "PAID" ? 0 : activeAppliedCents,
          paidCentsAtPayment: 0,
          remainingCentsAtPayment: 0,
          isReversed,
          isCorrected: (payment.correctionsReplacement?.length ?? 0) > 0,
        });
      }
    }
    const histories = new Map<string, NotePaymentHistory>();
    for (const [requestedId, note] of noteByRequestedId) {
      const totalCents = note.workOrderId && note.quote
        ? getEffectiveSettlementTotals(note.quote, note.quote.settlementAgreement).totalCents
        : note.totalCents;
      const history = paymentsByNote.get(note.id) ?? [];
      histories.set(requestedId, { totalCents, payments: withHistoricalBalances(totalCents, history) });
    }
    return histories;
  }
  const requestedIds = [...new Set(workOrderIds)];
  const workOrders = await prisma.workOrder.findMany({
    where: { id: { in: requestedIds } },
    select: {
      id: true,
      quoteId: true,
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
  const quoteIds = workOrders.map((workOrder) => workOrder.quoteId);
  if (quoteIds.length === 0) return new Map();

  const payments = await prisma.payment.findMany({
    where: { quoteId: { in: quoteIds } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      quoteId: true,
      amountCents: true,
      createdAt: true,
      method: true,
      status: true,
      reversedAt: true,
      correctionsReplacement: { select: { id: true } },
      applications: {
        where: { workOrderId: { in: workOrderIds } },
        select: { workOrderId: true, amountCents: true, reversedAt: true },
      },
    },
  });

  const workOrderByQuoteId = new Map(workOrders.map((workOrder) => [workOrder.quoteId, workOrder]));
  const histories = new Map<string, NotePaymentHistory>();
  for (const workOrder of workOrders) {
    const totals = getEffectiveSettlementTotals(workOrder.quote, workOrder.quote.settlementAgreement);
    histories.set(workOrder.id, { totalCents: totals.totalCents, payments: [] });
  }

  for (const payment of payments) {
    const workOrder = payment.quoteId ? workOrderByQuoteId.get(payment.quoteId) : undefined;
    if (!workOrder) continue;
    const history = histories.get(workOrder.id);
    if (!history) continue;
    const isReversed = Boolean(payment.reversedAt);
    const appliedCents = isReversed || payment.status !== "PAID"
      ? 0
      : payment.applications
          .filter((application) => application.reversedAt === null)
          .reduce((sum, application) => sum + application.amountCents, 0);
    history.payments.push({
      id: payment.id,
      paymentId: payment.id,
      date: payment.createdAt,
      method: payment.method,
      paymentStatus: payment.status,
      amountCents: payment.amountCents,
      appliedCents,
      paidCentsAtPayment: 0,
      remainingCentsAtPayment: 0,
      isReversed,
      isCorrected: (payment.correctionsReplacement?.length ?? 0) > 0,
    });
  }

  for (const history of histories.values()) {
    history.payments = withHistoricalBalances(history.totalCents, history.payments);
  }
  return histories;
}

export async function getQuotePaidTotals(quoteIds: string[]): Promise<Map<string, number>> {
  await requireOperationalRole();

  if (quoteIds.length === 0) {
    return new Map();
  }

  // Active payment captures per quote
  const paidPayments = await prisma.payment.groupBy({
    by: ["quoteId"],
    where: {
      quoteId: { in: quoteIds },
      status: PaymentStatus.PAID,
      reversedAt: null,
    },
    _sum: { amountCents: true },
  });

  return new Map(
    paidPayments
      .filter((p): p is typeof p & { quoteId: string } => p.quoteId !== null)
      .map((payment) => [payment.quoteId, payment._sum.amountCents ?? 0]),
  );
}

export async function getNoteFinancialStatus(workOrderId: string): Promise<NoteFinancialSummary> {
  await requireOperationalRole();
  return getNoteFinancialSummary(prisma, workOrderId);
}

export async function getCustomerAvailableCredit(customerId: string): Promise<CustomerCreditSummary> {
  await requireOperationalRole();
  return getCustomerCreditSummary(prisma, customerId);
}

export async function getEligibleNotesForCreditApplication(customerId: string): Promise<
  Array<{
    workOrderId: string;
    number: string;
    completedAt: Date | null;
    quoteTotalCents: number;
    appliedCents: number;
    pendingBalanceCents: number;
  }>
> {
  await requireOperationalRole();

  const completedOrders = await prisma.workOrder.findMany({
    where: {
      status: WorkOrderStatus.COMPLETED,
      quote: { customerId },
    },
    include: {
      quote: {
        select: {
          subtotalCents: true,
          discountCents: true,
          taxCents: true,
          totalCents: true,
          taxEnabled: true,
          items: { select: { quantity: true, unitPriceCents: true } },
          settlementAgreement: true,
        },
      },
      paymentApplications: {
        where: {
          reversedAt: null,
          payment: { status: PaymentStatus.PAID, reversedAt: null },
        },
        select: { amountCents: true },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  return completedOrders
    .map((wo) => {
      const quoteTotalCents = getEffectiveSettlementTotals(wo.quote, wo.quote.settlementAgreement).totalCents;
      const appliedCents = wo.paymentApplications.reduce((sum, app) => sum + app.amountCents, 0);
      const pendingBalanceCents = Math.max(0, quoteTotalCents - appliedCents);

      return {
        workOrderId: wo.id,
        number: wo.number,
        completedAt: wo.completedAt,
        quoteTotalCents,
        appliedCents,
        pendingBalanceCents,
      };
    })
    .filter((note) => note.pendingBalanceCents > 0);
}

export type PaymentCorrectionDetail = {
  id: string;
  reason: string;
  createdAt: Date;
  actor: { id: string; displayName: string } | null;
  originalPayment: { id: string; amountCents: number; method: PaymentMethod; operationKey: string };
  replacementPayment: { id: string; amountCents: number; method: PaymentMethod; operationKey: string };
  applications: Array<{
    id: string;
    workOrder: { id: string; number: string } | null;
    originalAmountCents: number;
    replacementAmountCents: number;
    shortfallCents: number;
  }>;
};

export async function hasActivePaymentApplicationForWorkOrder(workOrderId: string): Promise<boolean> {
  await requireOperationalRole();

  const count = await prisma.paymentApplication.count({
    where: {
      workOrderId,
      reversedAt: null,
      payment: { status: PaymentStatus.PAID, reversedAt: null },
    },
  });

  return count > 0;
}

export async function getPaymentCorrectionDetail(paymentId: string): Promise<PaymentCorrectionDetail | null> {
  await requireAdmin();

  const correction = await prisma.paymentCorrection.findFirst({
    where: {
      OR: [{ originalPaymentId: paymentId }, { replacementPaymentId: paymentId }],
    },
    include: {
      actor: { select: { id: true, displayName: true } },
      originalPayment: { select: { id: true, amountCents: true, method: true, operationKey: true } },
      replacementPayment: { select: { id: true, amountCents: true, method: true, operationKey: true } },
      applications: {
        orderBy: { sortOrder: "asc" },
        include: {
          workOrder: { select: { id: true, number: true } },
        },
      },
    },
  });

  if (!correction) return null;

  return {
    id: correction.id,
    reason: correction.reason,
    createdAt: correction.createdAt,
    actor: correction.actor,
    originalPayment: correction.originalPayment,
    replacementPayment: correction.replacementPayment,
    applications: correction.applications.map((app) => ({
      id: app.id,
      workOrder: app.workOrder,
      originalAmountCents: app.originalAmountCents,
      replacementAmountCents: app.replacementAmountCents,
      shortfallCents: app.shortfallCents,
    })),
  };
}
