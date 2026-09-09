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

export type PendingAttentionType = "quote" | "work_order";

export interface PendingAttentionItem {
  id: string;
  type: PendingAttentionType;
  href: string;
  customerName: string;
  vehicleDescription: string;
  statusLabel: string;
  statusVariant: "default" | "success" | "warning" | "danger" | "info";
  nextStep: string;
  updatedAt: Date;
}

export interface OperationalDashboardSnapshot {
  generatedAt: Date;
  queues: QueueMetrics;
  pendingAttention: PendingAttentionItem[];
  kpis: {
    week: PeriodMetrics;
    month: PeriodMetrics;
    year: PeriodMetrics;
  };
  weeklyPayroll: WeeklyPayrollEstimate;
}
