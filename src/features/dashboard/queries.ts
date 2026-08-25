import { AssignmentStatus, PaymentStatus, QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { buildWeeklyPayrollReport, type PayrollItemInput, type RawWorkOrderForPayroll } from "@/features/payroll/domain";
import { getDashboardPeriodRanges } from "./period";
import type {
  DashboardPeriodKey,
  OperationalDashboardSnapshot,
  PeriodMetrics,
  QueueMetrics,
  WeeklyPayrollEstimate,
} from "./types";

export async function getOperationalDashboardSnapshot(now = new Date()): Promise<OperationalDashboardSnapshot> {
  await requireOperationalRole();

  const ranges = getDashboardPeriodRanges(now);

  // 1. Live Queues
  const [commercialQueueCount, activeExecutionCount] = await Promise.all([
    prisma.quote.count({
      where: {
        deletedAt: null,
        status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED] },
        OR: [
          { workOrder: null },
          {
            workOrder: {
              status: {
                notIn: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED],
              },
            },
          },
        ],
      },
    }),
    prisma.workOrder.count({
      where: {
        status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] },
      },
    }),
  ]);

  const queues: QueueMetrics = {
    commercialQueueCount,
    activeExecutionCount,
  };

  // 2. Payments Collected per Period (grouped by createdAt for status=PAID)
  const [weekPayments, monthPayments, yearPayments] = await Promise.all([
    prisma.payment.aggregate({
      _count: { _all: true },
      _sum: { amountCents: true },
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: ranges.week.startDate, lt: ranges.week.endDate },
      },
    }),
    prisma.payment.aggregate({
      _count: { _all: true },
      _sum: { amountCents: true },
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: ranges.month.startDate, lt: ranges.month.endDate },
      },
    }),
    prisma.payment.aggregate({
      _count: { _all: true },
      _sum: { amountCents: true },
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: ranges.year.startDate, lt: ranges.year.endDate },
      },
    }),
  ]);

  // 3. Completed Work Orders per Period
  // Fetch all completed work orders within the broadest range (earliest start to latest end)
  const minStart = new Date(
    Math.min(
      ranges.week.startDate.getTime(),
      ranges.month.startDate.getTime(),
      ranges.year.startDate.getTime()
    )
  );
  const maxEnd = new Date(
    Math.max(
      ranges.week.endDate.getTime(),
      ranges.month.endDate.getTime(),
      ranges.year.endDate.getTime()
    )
  );

  const completedOrders = await prisma.workOrder.findMany({
    where: {
      status: WorkOrderStatus.COMPLETED,
      completedAt: {
        gte: minStart,
        lt: maxEnd,
      },
    },
    include: {
      quote: {
        include: {
          customer: true,
          vehicle: true,
          items: {
            orderBy: { sortOrder: "asc" },
          },
          sections: {
            where: { isAuthorized: true },
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
      assignments: {
        where: { status: { not: AssignmentStatus.CANCELLED } },
        include: {
          worker: true,
        },
      },
    },
    orderBy: {
      completedAt: "desc",
    },
  });

  // Calculate Labor Billed and build RawWorkOrders
  function getLaborBilledCents(wo: (typeof completedOrders)[number]): number {
    const itemMap = new Map<string, PayrollItemInput>();
    for (const item of wo.quote.items) {
      if (item.type === QuoteItemType.LABOR) {
        itemMap.set(item.id, {
          id: item.id,
          type: item.type,
          description: item.description,
          quantity: Number(item.quantity),
          unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
          totalCents: item.totalCents == null ? null : Number(item.totalCents),
        });
      }
    }
    if (wo.quote.sections) {
      for (const section of wo.quote.sections) {
        for (const item of section.items) {
          if (item.type === QuoteItemType.LABOR) {
            itemMap.set(item.id, {
              id: item.id,
              type: item.type,
              description: item.description,
              quantity: Number(item.quantity),
              unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
              totalCents: item.totalCents == null ? null : Number(item.totalCents),
            });
          }
        }
      }
    }

    let sum = 0;
    for (const item of itemMap.values()) {
      if (item.totalCents != null) {
        sum += item.totalCents;
      } else if (item.unitPriceCents != null) {
        sum += Math.round(item.unitPriceCents * item.quantity);
      }
    }
    return sum;
  }

  function getMaterialsBilledCents(wo: (typeof completedOrders)[number]): number {
    const itemMap = new Map<string, PayrollItemInput>();
    for (const item of wo.quote.items) {
      if (
        item.type === QuoteItemType.MATERIAL ||
        item.type === QuoteItemType.EQUIPMENT ||
        item.type === QuoteItemType.OTHER
      ) {
        itemMap.set(item.id, {
          id: item.id,
          type: item.type,
          description: item.description,
          quantity: Number(item.quantity),
          unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
          totalCents: item.totalCents == null ? null : Number(item.totalCents),
        });
      }
    }
    if (wo.quote.sections) {
      for (const section of wo.quote.sections) {
        for (const item of section.items) {
          if (
            item.type === QuoteItemType.MATERIAL ||
            item.type === QuoteItemType.EQUIPMENT ||
            item.type === QuoteItemType.OTHER
          ) {
            itemMap.set(item.id, {
              id: item.id,
              type: item.type,
              description: item.description,
              quantity: Number(item.quantity),
              unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
              totalCents: item.totalCents == null ? null : Number(item.totalCents),
            });
          }
        }
      }
    }

    let sum = 0;
    for (const item of itemMap.values()) {
      if (item.totalCents != null) {
        sum += item.totalCents;
      } else if (item.unitPriceCents != null) {
        sum += Math.round(item.unitPriceCents * item.quantity);
      }
    }
    return sum;
  }

  function filterPeriodOrders(startDate: Date, endDate: Date) {
    return completedOrders.filter((wo) => {
      if (!wo.completedAt) return false;
      const t = wo.completedAt.getTime();
      return t >= startDate.getTime() && t < endDate.getTime();
    });
  }

  const weekOrders = filterPeriodOrders(ranges.week.startDate, ranges.week.endDate);
  const monthOrders = filterPeriodOrders(ranges.month.startDate, ranges.month.endDate);
  const yearOrders = filterPeriodOrders(ranges.year.startDate, ranges.year.endDate);

  const kpis: Record<DashboardPeriodKey, PeriodMetrics> = {
    week: {
      period: "week",
      rangeLabel: ranges.week.rangeLabel,
      startDate: ranges.week.startDate,
      endDate: ranges.week.endDate,
      completedWorkOrdersCount: weekOrders.length,
      completedLaborBilledCents: weekOrders.reduce((acc, wo) => acc + getLaborBilledCents(wo), 0),
      completedMaterialsBilledCents: weekOrders.reduce((acc, wo) => acc + getMaterialsBilledCents(wo), 0),
      collectedPaymentsCount: weekPayments._count._all,
      collectedPaymentsTotalCents: weekPayments._sum.amountCents ?? 0,
    },
    month: {
      period: "month",
      rangeLabel: ranges.month.rangeLabel,
      startDate: ranges.month.startDate,
      endDate: ranges.month.endDate,
      completedWorkOrdersCount: monthOrders.length,
      completedLaborBilledCents: monthOrders.reduce((acc, wo) => acc + getLaborBilledCents(wo), 0),
      completedMaterialsBilledCents: monthOrders.reduce((acc, wo) => acc + getMaterialsBilledCents(wo), 0),
      collectedPaymentsCount: monthPayments._count._all,
      collectedPaymentsTotalCents: monthPayments._sum.amountCents ?? 0,
    },
    year: {
      period: "year",
      rangeLabel: ranges.year.rangeLabel,
      startDate: ranges.year.startDate,
      endDate: ranges.year.endDate,
      completedWorkOrdersCount: yearOrders.length,
      completedLaborBilledCents: yearOrders.reduce((acc, wo) => acc + getLaborBilledCents(wo), 0),
      completedMaterialsBilledCents: yearOrders.reduce((acc, wo) => acc + getMaterialsBilledCents(wo), 0),
      collectedPaymentsCount: yearPayments._count._all,
      collectedPaymentsTotalCents: yearPayments._sum.amountCents ?? 0,
    },
  };

  // 4. Weekly Payroll Estimate
  const serializedWeekOrders: RawWorkOrderForPayroll[] = weekOrders.map((wo) => {
    const mapItem = (item: (typeof wo.quote.items)[number]): PayrollItemInput => ({
      id: item.id,
      type: item.type,
      description: item.description,
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
      totalCents: item.totalCents == null ? null : Number(item.totalCents),
    });

    return {
      id: wo.id,
      number: wo.number,
      status: wo.status,
      completedAt: wo.completedAt,
      isSpecial: wo.isSpecial,
      specialAssigneeName: wo.specialAssigneeName,
      quote: {
        id: wo.quote.id,
        number: wo.quote.number,
        customer: wo.quote.customer ? { name: wo.quote.customer.name } : null,
        vehicle: wo.quote.vehicle
          ? {
              brand: wo.quote.vehicle.brand,
              model: wo.quote.vehicle.model,
              year: wo.quote.vehicle.year,
              plate: wo.quote.vehicle.plate,
            }
          : null,
        items: wo.quote.items.map(mapItem),
        sections: wo.quote.sections?.map((sec) => ({
          items: sec.items.map(mapItem),
        })),
      },
      assignments: wo.assignments.map((a) => ({
        workerId: a.workerId,
        status: a.status,
        worker: {
          id: a.worker.id,
          displayName: a.worker.displayName,
          workerKind: a.worker.workerKind,
          role: a.worker.role,
        },
      })),
    };
  });

  const weeklyPayrollReport = buildWeeklyPayrollReport(serializedWeekOrders, {
    startDate: ranges.week.startDate,
    endDate: ranges.week.endDate,
    rangeLabel: ranges.week.rangeLabel,
    isCurrentWeek: true,
  });

  const weeklyPayroll: WeeklyPayrollEstimate = {
    rangeLabel: ranges.week.rangeLabel,
    startDate: ranges.week.startDate,
    endDate: ranges.week.endDate,
    isCurrentWeek: true,
    totalWorkers: weeklyPayrollReport.totalWorkers,
    totalCompletedOrders: weeklyPayrollReport.totalCompletedOrders,
    estimatedCommissionsCents: weeklyPayrollReport.totalCommissionCents,
  };

  return {
    generatedAt: now,
    queues,
    kpis,
    weeklyPayroll,
  };
}
