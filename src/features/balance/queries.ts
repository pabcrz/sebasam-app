import { PaymentStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { aggregateReceivablesByCustomer, findReceivableWorkOrders } from "@/features/dashboard/queries";
import type { ReceivableCustomer } from "@/features/dashboard/types";
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";
import { billedByCategory, buildBalancePeriods, type BalancePeriodRow, type PeriodBucket } from "./domain";

export type IncomeBalance = {
  /** Money received in the period: never includes what is still owed. */
  collected: { totalCents: number; paymentsCount: number };
  /** Balance owed today, independent of the period. */
  receivables: { totalCents: number; customers: ReceivableCustomer[] };
  /** Settled-note billing by category and the rebuilt receivable at each close, oldest period first. */
  periods: BalancePeriodRow[];
};

const liveApplications = {
  where: { reversedAt: null, payment: { status: PaymentStatus.PAID, reversedAt: null } },
  select: { amountCents: true, createdAt: true },
} as const;

const billedItemSelect = { id: true, type: true, quantity: true, unitPriceCents: true, totalCents: true } as const;

async function findBalanceNotes() {
  const workOrders = await prisma.workOrder.findMany({
    where: { status: WorkOrderStatus.COMPLETED },
    select: {
      completedAt: true,
      paymentApplications: liveApplications,
      quote: {
        include: {
          settlementAgreement: true,
          items: { select: billedItemSelect },
          sections: { select: { items: { select: billedItemSelect } } },
        },
      },
    },
  });

  return workOrders.map((workOrder) => ({
    completedAt: workOrder.completedAt,
    totalCents: getEffectiveSettlementTotals(workOrder.quote, workOrder.quote.settlementAgreement).totalCents,
    billed: billedByCategory(
      [...workOrder.quote.items, ...workOrder.quote.sections.flatMap((section) => section.items)].map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
        totalCents: item.totalCents == null ? null : Number(item.totalCents),
      })),
    ),
    applications: workOrder.paymentApplications,
  }));
}

export async function getIncomeBalance(
  range: { start: Date | null; end: Date | null },
  buckets: PeriodBucket[],
  now = new Date(),
): Promise<IncomeBalance> {
  await requireOperationalRole();

  const [payments, receivableWorkOrders, notes] = await Promise.all([
    prisma.payment.aggregate({
      _count: { _all: true },
      _sum: { amountCents: true },
      // Same rule as the customer statement: reversed and corrected payments are not income.
      where: {
        status: PaymentStatus.PAID,
        reversedAt: null,
        correctionsOriginal: { none: {} },
        ...(range.start && range.end ? { createdAt: { gte: range.start, lt: range.end } } : {}),
      },
    }),
    findReceivableWorkOrders(),
    findBalanceNotes(),
  ]);

  const customers = aggregateReceivablesByCustomer(receivableWorkOrders, now);

  return {
    collected: { totalCents: payments._sum.amountCents ?? 0, paymentsCount: payments._count._all },
    receivables: {
      totalCents: customers.reduce((total, customer) => total + customer.pendingBalanceCents, 0),
      customers,
    },
    periods: buildBalancePeriods(notes, buckets),
  };
}
