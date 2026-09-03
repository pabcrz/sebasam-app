import { AssignmentStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import {
  buildWeeklyPayrollReport,
  type PayrollItemInput,
  type RawWorkOrderForPayroll,
  type WeeklyPayrollReport,
} from "./domain";
import { parsePayrollParams } from "./period";

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

  return buildWeeklyPayrollReport(serializedOrders, {
    mode: period.mode,
    startDate: period.start,
    endDate: period.end,
    rangeLabel: period.rangeLabel,
    isCurrentWeek: period.isCurrentWeek,
  });
}
