export type DashboardPeriodKey = "week" | "month" | "year";

export interface QueueMetrics {
  commercialQueueCount: number;
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

export interface OperationalDashboardSnapshot {
  generatedAt: Date;
  queues: QueueMetrics;
  kpis: {
    week: PeriodMetrics;
    month: PeriodMetrics;
    year: PeriodMetrics;
  };
  weeklyPayroll: WeeklyPayrollEstimate;
}
