export type DashboardPeriodKey = "week" | "month" | "year";

export interface QueueMetrics {
  draftQuotesCount: number;
  sentQuotesCount: number;
  approvedQuotesCount: number;
  activeExecutionCount: number;
}

export interface PeriodMetrics {
  period: DashboardPeriodKey;
  rangeLabel: string;
  startDate: Date;
  endDate: Date;
  completedWorkOrdersCount: number;
  completedLaborBilledCents: number;
  completedMaterialsBilledCents: number;
  collectedPaymentsCount: number;
  collectedPaymentsTotalCents: number;
}

export interface WeeklyPayrollEstimate {
  rangeLabel: string;
  startDate: Date;
  endDate: Date;
  isCurrentWeek: boolean;
  totalWorkers: number;
  totalCompletedOrders: number;
  estimatedCommissionsCents: number;
}

export interface ReceivableCustomer {
  customerId: string;
  customerName: string;
  pendingBalanceCents: number;
  oldestUnpaidDate: Date | null;
  isOverdue: boolean;
}

export interface NextWorkVehicle {
  economicNumber: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
}

/** Oldest approved quote without a work order: the featured "Siguiente trabajo". */
export interface NextWorkQuote {
  quoteId: string;
  number: string;
  title: string;
  customerName: string | null;
  totalCents: number | null;
  approvedAt: Date | null;
  vehicle: NextWorkVehicle | null;
}

export interface OperationalDashboardSnapshot {
  generatedAt: Date;
  queues: QueueMetrics;
  receivables: ReceivableCustomer[];
  kpis: {
    week: PeriodMetrics;
    month: PeriodMetrics;
    year: PeriodMetrics;
  };
  weeklyPayroll: WeeklyPayrollEstimate;
  nextWork: NextWorkQuote | null;
}
