import { AssignmentStatus, UserRole, WorkerKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  buildWeeklyPayrollReport,
  calculateFixedPayHelperPayroll,
  type FixedPayHelperPayrollSummary,
  type PayrollItemInput,
  type RawLaborAdvanceForPayroll,
  type RawWorkOrderForPayroll,
  type WeeklyPayrollReport,
} from "./domain";
import { parsePayrollParams } from "./period";
import { getPayrollWeekStatus } from "./week-control";

function weekStartFromAnchor(anchor: string) {
  return new Date(`${anchor}T00:00:00.000Z`);
}

async function getFixedPayHelpers(weekStart: Date): Promise<FixedPayHelperPayrollSummary[]> {
  const [savedWeeks, activeHelpers] = await Promise.all([
    prisma.helperPayrollWeek.findMany({
      where: { weekStart },
      include: {
        worker: {
          select: { id: true, displayName: true },
        },
      },
    }),
    prisma.userProfile.findMany({
      where: {
        role: UserRole.WORKER,
        workerKind: WorkerKind.HELPER,
        isActive: true,
        fixedWeeklyPayCents: { not: null },
        fixedDailyPayCents: { not: null },
      },
      select: {
        id: true,
        displayName: true,
        fixedWeeklyPayCents: true,
        fixedDailyPayCents: true,
      },
    }),
  ]);

  const savedWorkerIds = new Set(savedWeeks.map((week) => week.workerId));
  const newWeeks = await Promise.all(
    activeHelpers
      .filter((helper) => !savedWorkerIds.has(helper.id))
      .map((helper) =>
        prisma.helperPayrollWeek.upsert({
          where: {
            workerId_weekStart: {
              workerId: helper.id,
              weekStart,
            },
          },
          create: {
            workerId: helper.id,
            weekStart,
            weeklyRateCents: helper.fixedWeeklyPayCents!,
            dailyRateCents: helper.fixedDailyPayCents!,
          },
          update: {},
        })
      )
  );

  const helperNames = new Map(activeHelpers.map((helper) => [helper.id, helper.displayName]));
  for (const week of savedWeeks) {
    helperNames.set(week.workerId, week.worker.displayName);
  }

  return [...savedWeeks, ...newWeeks]
    .map((week) => {
      const { absenceDeductionCents, totalPayableCents } = calculateFixedPayHelperPayroll({
        weeklyRateCents: week.weeklyRateCents,
        dailyRateCents: week.dailyRateCents,
        absenceDays: week.absenceDays,
        manualCommissionCents: week.manualCommissionCents,
      });

      return {
        workerId: week.workerId,
        displayName: helperNames.get(week.workerId) ?? "Worker",
        weeklyRateCents: week.weeklyRateCents,
        dailyRateCents: week.dailyRateCents,
        absenceDays: week.absenceDays,
        absenceDeductionCents,
        manualCommissionCents: week.manualCommissionCents,
        totalPayableCents,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getWeeklyPayroll(
  searchParams: Record<string, string | string[] | undefined> = {}
): Promise<WeeklyPayrollReport> {
  await requireOperationalRole();

  const period = parsePayrollParams(searchParams);

  const rawWorkOrders = await prisma.workOrder.findMany({
    where: {
      status: WorkOrderStatus.COMPLETED,
      completedAt: {
        gte: period.start,
        lt: period.end,
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

  const orderIds = rawWorkOrders.map((wo) => wo.id);
  const [historicalAdvances, weekAdvances, weekStatus] = await Promise.all([
    orderIds.length > 0
      ? prisma.workOrderLaborAdvance.findMany({
          where: { workOrderId: { in: orderIds } },
          select: {
            workOrderId: true,
            quoteItemId: true,
            advanceBaseCents: true,
          },
        })
      : Promise.resolve([]),
    prisma.workOrderLaborAdvance.findMany({
      where:
        period.mode === "monthly"
          ? {
              weekStart: {
                gte: period.start,
                lt: period.end,
              },
            }
          : {
              weekStart: weekStartFromAnchor(period.anchor),
            },
      include: {
        workOrder: {
          include: {
            quote: {
              include: {
                customer: true,
                vehicle: true,
              },
            },
          },
        },
        quoteItem: { select: { description: true } },
        worker: { select: { displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getPayrollWeekStatus(period.anchor),
  ]);

  const historicalAdvancesByOrder = new Map<string, Array<{ quoteItemId: string; advanceBaseCents: number }>>();
  for (const adv of historicalAdvances) {
    const list = historicalAdvancesByOrder.get(adv.workOrderId) ?? [];
    list.push({ quoteItemId: adv.quoteItemId, advanceBaseCents: adv.advanceBaseCents });
    historicalAdvancesByOrder.set(adv.workOrderId, list);
  }

  const serializedOrders: RawWorkOrderForPayroll[] = rawWorkOrders.map((wo) => {
    const mapItem = (item: (typeof wo.quote.items)[number]): PayrollItemInput => ({
      id: item.id,
      type: item.type,
      description: item.description,
      quantity: Number(item.quantity),
      unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
      totalCents: item.totalCents == null ? null : Number(item.totalCents),
      includeInPayroll: item.includeInPayroll,
      customRatePercent: item.customRatePercent,
      customPayrollBaseCents: item.customPayrollBaseCents == null ? null : Number(item.customPayrollBaseCents),
      payrollConfigLockedAt: item.payrollConfigLockedAt,
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
      previousAdvances: historicalAdvancesByOrder.get(wo.id) ?? [],
    };
  });

  const serializedAdvances: RawLaborAdvanceForPayroll[] = weekAdvances.map((adv) => {
    const wo = adv.workOrder;
    const vehicleDesc = wo.quote.vehicle
      ? [wo.quote.vehicle.brand, wo.quote.vehicle.model].filter(Boolean).join(" ")
      : "";
    const vehicleSummary = wo.quote.vehicle
      ? `${vehicleDesc || "Vehículo"}${wo.quote.vehicle.plate ? ` (${wo.quote.vehicle.plate})` : ""}`
      : "Sin vehículo";

    return {
      id: adv.id,
      workOrderId: adv.workOrderId,
      workOrderNumber: wo.number,
      quoteId: wo.quote.id,
      quoteNumber: wo.quote.number,
      clientName: wo.quote.customer?.name ?? "Cliente General",
      vehicleSummary,
      workerId: adv.workerId,
      workerDisplayName: adv.worker.displayName,
      quoteItemId: adv.quoteItemId,
      conceptDescription: adv.quoteItem.description,
      advanceBaseCents: adv.advanceBaseCents,
      advancePercentage: adv.advancePercentage,
      commissionRatePercent: adv.commissionRatePercent,
      commissionCents: adv.commissionCents,
      notes: adv.notes,
      createdAt: adv.createdAt,
    };
  });

  const commissionReport = buildWeeklyPayrollReport(serializedOrders, {
    mode: period.mode,
    startDate: period.start,
    endDate: period.end,
    rangeLabel: period.rangeLabel,
    isCurrentWeek: period.isCurrentWeek,
    advances: serializedAdvances,
  });

  if (period.mode !== "weekly") {
    return {
      ...commissionReport,
      weekStatus,
      laborAdvances: serializedAdvances,
    };
  }

  const fixedPayHelpers = await getFixedPayHelpers(weekStartFromAnchor(period.anchor));
  const totalFixedWeeklyPayCents = fixedPayHelpers.reduce((total, helper) => total + helper.weeklyRateCents, 0);
  const totalAbsenceDeductionsCents = fixedPayHelpers.reduce(
    (total, helper) => total + helper.absenceDeductionCents,
    0
  );
  const totalManualCommissionsCents = fixedPayHelpers.reduce(
    (total, helper) => total + helper.manualCommissionCents,
    0
  );

  return {
    ...commissionReport,
    weekStatus,
    laborAdvances: serializedAdvances,
    totalWorkers: commissionReport.totalWorkers + fixedPayHelpers.length,
    totalFixedWeeklyPayCents,
    totalAbsenceDeductionsCents,
    totalManualCommissionsCents,
    totalPayableCents:
      commissionReport.totalCommissionCents +
      totalFixedWeeklyPayCents -
      totalAbsenceDeductionsCents +
      totalManualCommissionsCents,
    fixedPayHelpers,
  };
}
