import { requireOperationalRole } from "@/lib/auth/session";
import {
  aggregateReceivablesByCustomer,
  listReceivableWorkOrders,
  sumCollectedPayments,
} from "@/features/dashboard/queries";
import { getDashboardPeriodRanges } from "@/features/dashboard/period";
import type { DashboardPeriodKey } from "@/features/dashboard/types";
import type { BalanceSnapshot, CollectedPeriod } from "./types";

const PERIODS: DashboardPeriodKey[] = ["week", "month", "year"];

/** Reuses the dashboard's sources and rules: collected = PAID payments, receivable = completed notes minus active applications. */
export async function getBalanceSnapshot(now = new Date()): Promise<BalanceSnapshot> {
  await requireOperationalRole();

  const ranges = getDashboardPeriodRanges(now);
  const [week, month, year, workOrders] = await Promise.all([
    sumCollectedPayments(ranges.week),
    sumCollectedPayments(ranges.month),
    sumCollectedPayments(ranges.year),
    listReceivableWorkOrders(),
  ]);
  const sums = { week, month, year };

  const collected = Object.fromEntries(
    PERIODS.map((period): [DashboardPeriodKey, CollectedPeriod] => [
      period,
      {
        period,
        rangeLabel: ranges[period].rangeLabel,
        paymentsCount: sums[period]._count._all,
        totalCents: sums[period]._sum.amountCents ?? 0,
      },
    ]),
  ) as BalanceSnapshot["collected"];

  const customers = aggregateReceivablesByCustomer(workOrders, now);
  return {
    generatedAt: now,
    collected,
    receivables: {
      totalCents: customers.reduce((sum, customer) => sum + customer.pendingBalanceCents, 0),
      overdueCents: customers.reduce((sum, customer) => sum + customer.overdueBalanceCents, 0),
      customers,
    },
  };
}
