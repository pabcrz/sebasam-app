import { PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { aggregateReceivablesByCustomer, findReceivableWorkOrders } from "@/features/dashboard/queries";
import type { ReceivableCustomer } from "@/features/dashboard/types";

export type IncomeBalance = {
  /** Money received in the period: never includes what is still owed. */
  collected: { totalCents: number; paymentsCount: number };
  /** Balance owed today, independent of the period. */
  receivables: { totalCents: number; customers: ReceivableCustomer[] };
};

export async function getIncomeBalance(
  range: { start: Date | null; end: Date | null },
  now = new Date(),
): Promise<IncomeBalance> {
  await requireOperationalRole();

  const [payments, receivableWorkOrders] = await Promise.all([
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
  ]);

  const customers = aggregateReceivablesByCustomer(receivableWorkOrders, now);

  return {
    collected: { totalCents: payments._sum.amountCents ?? 0, paymentsCount: payments._count._all },
    receivables: {
      totalCents: customers.reduce((total, customer) => total + customer.pendingBalanceCents, 0),
      customers,
    },
  };
}
