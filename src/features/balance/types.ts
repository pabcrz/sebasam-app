import type { DashboardPeriodKey, ReceivableCustomer } from "@/features/dashboard/types";

export interface CollectedPeriod {
  period: DashboardPeriodKey;
  rangeLabel: string;
  /** Payments marked PAID whose capture date falls in the period. */
  paymentsCount: number;
  totalCents: number;
}

/** Money received and money still owed are different things and are never added together. */
export interface BalanceSnapshot {
  generatedAt: Date;
  collected: Record<DashboardPeriodKey, CollectedPeriod>;
  receivables: {
    /** Pending balance of completed notes. Not cash. */
    totalCents: number;
    overdueCents: number;
    customers: ReceivableCustomer[];
  };
}
