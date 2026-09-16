import { PayrollPeriodStatus, QuoteItemType, WorkerKind } from "@prisma/client";

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
  includeInPayroll?: boolean | null;
  customPayrollBaseCents?: number | null;
  customRatePercent?: number | null;
  payrollConfigLockedAt?: Date | string | null;
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
  hasCustomBase?: boolean;
  hasCustomRate?: boolean;
  previousAdvancesBaseCents?: number;
  remainingBaseCents?: number;
  isLocked?: boolean;
}

export interface RawLaborAdvanceForPayroll {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  quoteId: string;
  quoteNumber: string;
  quoteTitle: string;
  clientName: string;
  vehicleSummary: string;
  workerId: string;
  workerDisplayName: string;
  quoteItemId: string;
  conceptDescription: string;
  advanceBaseCents: number;
  advancePercentage: number;
  commissionRatePercent: number;
  commissionCents: number;
  notes?: string | null;
  createdAt?: Date | string;
}

export interface WorkOrderPayrollDetail {
  workOrderId: string;
  workOrderNumber: string;
  quoteId: string;
  quoteNumber: string;
  quoteTitle: string;
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

  // Advance fields
  isAdvance?: boolean;
  advanceId?: string;
  quoteItemId?: string;
  conceptDescription?: string;
  advanceBaseCents?: number;
  advancePercentage?: number;
  commissionRatePercent?: number;
  notes?: string | null;
  previousAdvancesBaseCents?: number;
  remainingBaseCents?: number;
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

export interface FixedPayHelperPayrollSummary {
  workerId: string;
  displayName: string;
  weeklyRateCents: number;
  dailyRateCents: number;
  absenceDays: number;
  absenceDeductionCents: number;
  manualCommissionCents: number;
  totalPayableCents: number;
}

export interface FixedPayHelperCalculationInput {
  weeklyRateCents: number;
  dailyRateCents: number;
  absenceDays: number;
  manualCommissionCents: number;
}

export function calculateFixedPayHelperPayroll({
  weeklyRateCents,
  dailyRateCents,
  absenceDays,
  manualCommissionCents,
}: FixedPayHelperCalculationInput) {
  const absenceDeductionCents = Math.min(
    Math.max(0, weeklyRateCents),
    Math.max(0, dailyRateCents) * Math.max(0, absenceDays)
  );
  const totalPayableCents =
    Math.max(0, weeklyRateCents) - absenceDeductionCents + Math.max(0, manualCommissionCents);

  return { absenceDeductionCents, totalPayableCents };
}

export interface WeeklyPayrollReport {
  mode?: "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  rangeLabel: string;
  isCurrentWeek: boolean;
  totalWorkers: number;
  totalCompletedOrders: number;
  totalClientLaborCents: number;
  totalPayrollBaseCents: number;
  totalCommissionCents: number;
  totalFixedWeeklyPayCents?: number;
  totalAbsenceDeductionsCents?: number;
  totalManualCommissionsCents?: number;
  totalPayableCents?: number;
  workers: WorkerPayrollSummary[];
  fixedPayHelpers?: FixedPayHelperPayrollSummary[];
  unassignedOrders: WorkOrderPayrollDetail[];
  weekStatus?: PayrollPeriodStatus;
  laborAdvances?: RawLaborAdvanceForPayroll[];
}

export type PayrollReport = WeeklyPayrollReport;

export interface PayrollJobRow {
  order: WorkOrderPayrollDetail;
  masterId: string | null;
  masterName: string;
}

/** Flattens worker-oriented report data into the job-first view order. */
export function getPayrollJobRows(report: WeeklyPayrollReport, masterId = "all"): PayrollJobRow[] {
  const rows = new Map<string, PayrollJobRow>();

  for (const worker of report.workers) {
    if (masterId !== "all" && worker.workerId !== masterId) continue;
    for (const order of worker.workOrders) {
      rows.set(order.workOrderId, {
        order,
        masterId: order.masterId ?? worker.workerId,
        masterName: order.masterName ?? worker.displayName,
      });
    }
  }

  if (masterId === "all") {
    for (const order of report.unassignedOrders) {
      rows.set(order.workOrderId, {
        order,
        masterId: order.masterId ?? null,
        masterName: order.masterName ?? "Sin maestro",
      });
    }
  }

  return [...rows.values()].sort((a, b) => {
    const aTime = a.order.completedAt ? new Date(a.order.completedAt).getTime() : 0;
    const bTime = b.order.completedAt ? new Date(b.order.completedAt).getTime() : 0;
    return aTime - bTime || a.order.workOrderNumber.localeCompare(b.order.workOrderNumber);
  });
}

/**
 * Processes a single quote item for payroll calculation.
 * Returns null if the item is not commissionable (i.e. not LABOR and not an OTHER item with includeInPayroll).
 */
export function evaluatePayrollItem(
  item: PayrollItemInput,
  previousAdvancesBaseCents = 0
): PayrollItemResult | null {
  const isLabor = item.type === QuoteItemType.LABOR;
  const isCommissionableOther = item.type === QuoteItemType.OTHER && Boolean(item.includeInPayroll);

  if (!isLabor && !isCommissionableOther) {
    return null;
  }

  const clientTotal = item.totalCents ?? 0;
  const payrollBase = item.customPayrollBaseCents != null ? item.customPayrollBaseCents : clientTotal;

  let category: LaborCategory;
  let ratePercent: number;

  if (isCommissionableOther) {
    category = "GENERAL";
    ratePercent = item.customRatePercent != null ? item.customRatePercent : 40;
  } else {
    category = detectLaborCategory(item.description);
    ratePercent = item.customRatePercent != null ? item.customRatePercent : getDefaultLaborRate(category);
  }

  const remainingBaseCents = Math.max(0, payrollBase - previousAdvancesBaseCents);
  const commissionCents = computeCommissionCents(remainingBaseCents, ratePercent);

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
    hasCustomBase: item.customPayrollBaseCents != null,
    hasCustomRate: item.customRatePercent != null,
    previousAdvancesBaseCents,
    remainingBaseCents,
    isLocked: Boolean(item.payrollConfigLockedAt),
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
    title: string;
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
  previousAdvances?: Array<{
    quoteItemId: string;
    advanceBaseCents: number;
  }>;
}

/**
 * Transforms a collection of raw work orders into a comprehensive weekly payroll report.
 */
export function buildWeeklyPayrollReport(
  orders: RawWorkOrderForPayroll[],
  options: {
    mode?: "weekly" | "monthly";
    startDate: Date;
    endDate: Date;
    rangeLabel: string;
    isCurrentWeek: boolean;
    advances?: RawLaborAdvanceForPayroll[];
  }
): WeeklyPayrollReport {
  const workerMap = new Map<string, WorkerPayrollSummary>();
  const unassignedOrders: WorkOrderPayrollDetail[] = [];

  let grandTotalClientLabor = 0;
  let grandTotalPayrollBase = 0;
  let grandTotalCommission = 0;
  let grandTotalCompletedOrders = 0;

  for (const wo of orders) {
    // Gather unique items from quote (deduplicate items present in both quote.items and sections)
    const itemMap = new Map<string, PayrollItemInput>();
    for (const item of wo.quote.items) {
      itemMap.set(item.id, item);
    }
    if (wo.quote.sections) {
      for (const section of wo.quote.sections) {
        for (const item of section.items) {
          itemMap.set(item.id, item);
        }
      }
    }
    const rawItems = Array.from(itemMap.values());

    const previousAdvancesMap = new Map<string, number>();
    if (wo.previousAdvances) {
      for (const adv of wo.previousAdvances) {
        previousAdvancesMap.set(
          adv.quoteItemId,
          (previousAdvancesMap.get(adv.quoteItemId) ?? 0) + adv.advanceBaseCents
        );
      }
    }

    // Evaluate labor items
    const evaluatedItems: PayrollItemResult[] = [];
    let orderClientLabor = 0;
    let orderPayrollBase = 0;
    let orderCommission = 0;
    let orderPreviousAdvancesBase = 0;

    for (const item of rawItems) {
      const prevBase = previousAdvancesMap.get(item.id) ?? 0;
      orderPreviousAdvancesBase += prevBase;
      const evaluated = evaluatePayrollItem(item, prevBase);
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
      quoteTitle: wo.quote.title,
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
      isAdvance: false,
      previousAdvancesBaseCents: orderPreviousAdvancesBase,
      remainingBaseCents: Math.max(0, orderPayrollBase - orderPreviousAdvancesBase),
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

  // Process period advances
  if (options.advances && options.advances.length > 0) {
    for (const adv of options.advances) {
      grandTotalPayrollBase += adv.advanceBaseCents;
      grandTotalCommission += adv.commissionCents;

      const workerId = adv.workerId;
      if (!workerMap.has(workerId)) {
        workerMap.set(workerId, {
          workerId,
          displayName: adv.workerDisplayName,
          workerKind: WorkerKind.MASTER,
          completedOrderCount: 0,
          totalClientLaborCents: 0,
          totalPayrollBaseCents: 0,
          totalCommissionCents: 0,
          workOrders: [],
        });
      }

      const summary = workerMap.get(workerId)!;
      summary.totalPayrollBaseCents += adv.advanceBaseCents;
      summary.totalCommissionCents += adv.commissionCents;

      const advanceDetail: WorkOrderPayrollDetail = {
        workOrderId: adv.workOrderId,
        workOrderNumber: adv.workOrderNumber,
        quoteId: adv.quoteId,
        quoteNumber: adv.quoteNumber,
        quoteTitle: adv.quoteTitle,
        clientName: adv.clientName,
        vehicleSummary: adv.vehicleSummary,
        completedAt: null,
        isSpecial: false,
        masterId: adv.workerId,
        masterName: adv.workerDisplayName,
        helperNames: [],
        items: [],
        totalClientLaborCents: adv.advanceBaseCents,
        totalPayrollBaseCents: adv.advanceBaseCents,
        totalCommissionCents: adv.commissionCents,
        isAdvance: true,
        advanceId: adv.id,
        quoteItemId: adv.quoteItemId,
        conceptDescription: adv.conceptDescription,
        advanceBaseCents: adv.advanceBaseCents,
        advancePercentage: adv.advancePercentage,
        commissionRatePercent: adv.commissionRatePercent,
        notes: adv.notes,
      };

      summary.workOrders.push(advanceDetail);
    }
  }

  const workers = Array.from(workerMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    mode: options.mode ?? "weekly",
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
