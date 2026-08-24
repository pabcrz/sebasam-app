import { QuoteItemType, WorkerKind } from "@prisma/client";

export const DEFAULT_GENERAL_LABOR_RATE = 50; // 50%
export const DEFAULT_WELDING_LABOR_RATE = 40; // 40%

export type LaborCategory = "GENERAL" | "WELDING";

/**
 * Checks whether a description corresponds to welding, torch cutting, or related metalwork.
 */
export function detectLaborCategory(description: string): LaborCategory {
  const normalized = description.toLowerCase().trim();
  const weldingRegex = /\b(soldadura|soldar|soplete|oxicorte)\b/i;
  if (weldingRegex.test(normalized)) {
    return "WELDING";
  }
  return "GENERAL";
}

/**
 * Returns the default commission percentage according to the labor category.
 */
export function getDefaultLaborRate(category: LaborCategory): number {
  return category === "WELDING" ? DEFAULT_WELDING_LABOR_RATE : DEFAULT_GENERAL_LABOR_RATE;
}

/**
 * Computes commission in cents given a base amount in cents and a percentage.
 */
export function computeCommissionCents(baseCents: number, ratePercent: number): number {
  if (baseCents <= 0 || ratePercent <= 0) return 0;
  return Math.round((baseCents * ratePercent) / 100);
}

export interface PayrollItemInput {
  id: string;
  type: QuoteItemType;
  description: string;
  quantity: number;
  unitPriceCents: number | null;
  totalCents: number | null;
  customPayrollBaseCents?: number | null;
  customRatePercent?: number | null;
}

export interface PayrollItemResult {
  id: string;
  type: QuoteItemType;
  description: string;
  quantity: number;
  unitPriceCents: number;
  clientTotalCents: number;
  payrollBaseCents: number;
  category: LaborCategory;
  ratePercent: number;
  commissionCents: number;
}

export interface WorkOrderPayrollDetail {
  workOrderId: string;
  workOrderNumber: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  vehicleSummary: string;
  completedAt: Date | string | null;
  isSpecial: boolean;
  specialAssigneeName?: string | null;
  masterId?: string | null;
  masterName?: string | null;
  helperNames: string[];
  items: PayrollItemResult[];
  totalClientLaborCents: number;
  totalPayrollBaseCents: number;
  totalCommissionCents: number;
}

export interface WorkerPayrollSummary {
  workerId: string;
  displayName: string;
  workerKind: WorkerKind | "SPECIAL";
  completedOrderCount: number;
  totalClientLaborCents: number;
  totalPayrollBaseCents: number;
  totalCommissionCents: number;
  workOrders: WorkOrderPayrollDetail[];
}

export interface WeeklyPayrollReport {
  startDate: Date;
  endDate: Date;
  rangeLabel: string;
  isCurrentWeek: boolean;
  totalWorkers: number;
  totalCompletedOrders: number;
  totalClientLaborCents: number;
  totalPayrollBaseCents: number;
  totalCommissionCents: number;
  workers: WorkerPayrollSummary[];
  unassignedOrders: WorkOrderPayrollDetail[];
}

/**
 * Processes a single quote item for payroll calculation.
 * Returns null if the item is not labor.
 */
export function evaluatePayrollItem(item: PayrollItemInput): PayrollItemResult | null {
  if (item.type !== QuoteItemType.LABOR && item.type !== QuoteItemType.SERVICE) {
    return null;
  }

  const clientTotal = item.totalCents ?? 0;
  const payrollBase = item.customPayrollBaseCents != null ? item.customPayrollBaseCents : clientTotal;
  const category = detectLaborCategory(item.description);
  const ratePercent = item.customRatePercent != null ? item.customRatePercent : getDefaultLaborRate(category);
  const commissionCents = computeCommissionCents(payrollBase, ratePercent);

  return {
    id: item.id,
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents ?? 0,
    clientTotalCents: clientTotal,
    payrollBaseCents: payrollBase,
    category,
    ratePercent,
    commissionCents,
  };
}

export interface RawWorkOrderForPayroll {
  id: string;
  number: string;
  status: string;
  completedAt: Date | null;
  isSpecial: boolean;
  specialAssigneeName: string | null;
  quote: {
    id: string;
    number: string;
    customer: { name: string } | null;
    vehicle: { brand?: string | null; model?: string | null; year?: number | null; plate?: string | null } | null;
    items: PayrollItemInput[];
    sections?: Array<{ items: PayrollItemInput[] }>;
  };
  assignments: Array<{
    workerId: string;
    status: string;
    worker: {
      id: string;
      displayName: string;
      workerKind: WorkerKind | null;
      role: string;
    };
  }>;
}

/**
 * Transforms a collection of raw work orders into a comprehensive weekly payroll report.
 */
export function buildWeeklyPayrollReport(
  orders: RawWorkOrderForPayroll[],
  options: {
    startDate: Date;
    endDate: Date;
    rangeLabel: string;
    isCurrentWeek: boolean;
  }
): WeeklyPayrollReport {
  const workerMap = new Map<string, WorkerPayrollSummary>();
  const unassignedOrders: WorkOrderPayrollDetail[] = [];

  let grandTotalClientLabor = 0;
  let grandTotalPayrollBase = 0;
  let grandTotalCommission = 0;
  let grandTotalCompletedOrders = 0;

  for (const wo of orders) {
    // Gather all items from quote and authorized sections
    const rawItems: PayrollItemInput[] = [...wo.quote.items];
    if (wo.quote.sections) {
      for (const section of wo.quote.sections) {
        rawItems.push(...section.items);
      }
    }

    // Evaluate labor items
    const evaluatedItems: PayrollItemResult[] = [];
    let orderClientLabor = 0;
    let orderPayrollBase = 0;
    let orderCommission = 0;

    for (const item of rawItems) {
      const evaluated = evaluatePayrollItem(item);
      if (evaluated) {
        evaluatedItems.push(evaluated);
        orderClientLabor += evaluated.clientTotalCents;
        orderPayrollBase += evaluated.payrollBaseCents;
        orderCommission += evaluated.commissionCents;
      }
    }

    grandTotalCompletedOrders += 1;
    grandTotalClientLabor += orderClientLabor;
    grandTotalPayrollBase += orderPayrollBase;
    grandTotalCommission += orderCommission;

    const masterAssignment = wo.assignments.find((a) => a.worker.workerKind === WorkerKind.MASTER);
    const helperAssignments = wo.assignments.filter((a) => a.worker.workerKind === WorkerKind.HELPER);

    const vehicleDesc = wo.quote.vehicle
      ? [wo.quote.vehicle.brand, wo.quote.vehicle.model].filter(Boolean).join(" ")
      : "";
    const vehicleSummary = wo.quote.vehicle
      ? `${vehicleDesc || "Vehículo"}${wo.quote.vehicle.plate ? ` (${wo.quote.vehicle.plate})` : ""}`
      : "Sin vehículo";

    const detail: WorkOrderPayrollDetail = {
      workOrderId: wo.id,
      workOrderNumber: wo.number,
      quoteId: wo.quote.id,
      quoteNumber: wo.quote.number,
      clientName: wo.quote.customer?.name ?? "Cliente General",
      vehicleSummary,
      completedAt: wo.completedAt,
      isSpecial: wo.isSpecial,
      specialAssigneeName: wo.specialAssigneeName,
      masterId: masterAssignment?.worker.id ?? null,
      masterName: masterAssignment?.worker.displayName ?? (wo.isSpecial ? (wo.specialAssigneeName || "Taller / Especial") : null),
      helperNames: helperAssignments.map((h) => h.worker.displayName),
      items: evaluatedItems,
      totalClientLaborCents: orderClientLabor,
      totalPayrollBaseCents: orderPayrollBase,
      totalCommissionCents: orderCommission,
    };

    if (wo.isSpecial) {
      const specialKey = `special-${wo.specialAssigneeName || "taller"}`;
      if (!workerMap.has(specialKey)) {
        workerMap.set(specialKey, {
          workerId: specialKey,
          displayName: wo.specialAssigneeName ? `Especial (${wo.specialAssigneeName})` : "Taller (Especial)",
          workerKind: "SPECIAL",
          completedOrderCount: 0,
          totalClientLaborCents: 0,
          totalPayrollBaseCents: 0,
          totalCommissionCents: 0,
          workOrders: [],
        });
      }
      const summary = workerMap.get(specialKey)!;
      summary.completedOrderCount += 1;
      summary.totalClientLaborCents += orderClientLabor;
      summary.totalPayrollBaseCents += orderPayrollBase;
      summary.totalCommissionCents += orderCommission;
      summary.workOrders.push(detail);
    } else if (masterAssignment) {
      const workerId = masterAssignment.worker.id;
      if (!workerMap.has(workerId)) {
        workerMap.set(workerId, {
          workerId,
          displayName: masterAssignment.worker.displayName,
          workerKind: WorkerKind.MASTER,
          completedOrderCount: 0,
          totalClientLaborCents: 0,
          totalPayrollBaseCents: 0,
          totalCommissionCents: 0,
          workOrders: [],
        });
      }
      const summary = workerMap.get(workerId)!;
      summary.completedOrderCount += 1;
      summary.totalClientLaborCents += orderClientLabor;
      summary.totalPayrollBaseCents += orderPayrollBase;
      summary.totalCommissionCents += orderCommission;
      summary.workOrders.push(detail);
    } else {
      unassignedOrders.push(detail);
    }
  }

  const workers = Array.from(workerMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    startDate: options.startDate,
    endDate: options.endDate,
    rangeLabel: options.rangeLabel,
    isCurrentWeek: options.isCurrentWeek,
    totalWorkers: workers.length,
    totalCompletedOrders: grandTotalCompletedOrders,
    totalClientLaborCents: grandTotalClientLabor,
    totalPayrollBaseCents: grandTotalPayrollBase,
    totalCommissionCents: grandTotalCommission,
    workers,
    unassignedOrders,
  };
}
