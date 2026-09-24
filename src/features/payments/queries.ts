import { PaymentMethod, PaymentStatus, WorkOrderStatus } from "@prisma/client";
import { requireAdmin, requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getCustomerCreditSummary,
  getNoteFinancialSummary,
  type CustomerCreditSummary,
  type NoteFinancialSummary,
} from "./domain";
import { getPayableNotePaymentHistory } from "@/features/payable-notes/domain";
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";
import { withHistoricalBalances, type NotePaymentHistoryItem } from "./lib/payment-register";

export type NotePaymentHistory = {
  totalCents: number;
  payments: NotePaymentHistoryItem[];
};

export async function getNotePaymentHistory(workOrderIds: string[]): Promise<Map<string, NotePaymentHistory>> {
  await requireOperationalRole();
  // Kept for focused legacy query tests and older read replicas while the
  // payable-note columns are being rolled out. Production uses the generic
  // boundary below whenever the delegate exists.
  if (!(prisma as typeof prisma & { payableNote?: unknown }).payableNote) {
    const workOrders = await prisma.workOrder.findMany({
      where: { id: { in: workOrderIds } },
      select: { id: true, quoteId: true, quote: { select: { subtotalCents: true, taxCents: true, totalCents: true, settlementAgreement: true } } },
    });
    const payments = await prisma.payment.findMany({
      where: { quoteId: { in: workOrders.map((workOrder) => workOrder.quoteId) } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, quoteId: true, amountCents: true, createdAt: true, method: true, status: true, reversedAt: true, correctionsReplacement: { select: { id: true } }, applications: { where: { workOrderId: { in: workOrderIds } }, select: { workOrderId: true, amountCents: true, reversedAt: true } } },
    });
    const byQuote = new Map(workOrders.map((workOrder) => [workOrder.quoteId, workOrder]));
    const histories = new Map<string, NotePaymentHistory>(workOrders.map((workOrder) => [workOrder.id, { totalCents: getEffectiveSettlementTotals(workOrder.quote, workOrder.quote.settlementAgreement).totalCents, payments: [] }]));
    for (const payment of payments) {
      const workOrder = payment.quoteId ? byQuote.get(payment.quoteId) : undefined;
      const history = workOrder ? histories.get(workOrder.id) : undefined;
      if (!history) continue;
      const isReversed = Boolean(payment.reversedAt);
      history.payments.push({ id: payment.id, paymentId: payment.id, date: payment.createdAt, method: payment.method, paymentStatus: payment.status, amountCents: payment.amountCents, appliedCents: isReversed || payment.status !== "PAID" ? 0 : payment.applications.filter((application) => application.reversedAt === null).reduce((sum, application) => sum + application.amountCents, 0), paidCentsAtPayment: 0, remainingCentsAtPayment: 0, isReversed, isCorrected: (payment.correctionsReplacement?.length ?? 0) > 0 });
    }
    for (const history of histories.values()) history.payments = withHistoricalBalances(history.totalCents, history.payments);
    return histories;
  }
  const histories = new Map<string, NotePaymentHistory>();
  for (const id of workOrderIds) {
    const payableNote = await prisma.payableNote.findFirst({
      where: { OR: [{ id }, { workOrderId: id }] },
      select: { id: true },
    });
    if (!payableNote) continue;
    const history = await getPayableNotePaymentHistory(payableNote.id);
    histories.set(id, { totalCents: history.note.totalCents, payments: history.payments });
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
      quote: { select: { subtotalCents: true, taxCents: true, totalCents: true, settlementAgreement: true } },
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
