import { PaymentStatus, WorkOrderStatus } from "@prisma/client";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  getCustomerCreditSummary,
  getNoteFinancialSummary,
  type CustomerCreditSummary,
  type NoteFinancialSummary,
} from "./domain";

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
      quote: { select: { totalCents: true } },
      paymentApplications: {
        where: { reversedAt: null },
        select: { amountCents: true },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  return completedOrders
    .map((wo) => {
      const quoteTotalCents = wo.quote.totalCents ?? 0;
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
