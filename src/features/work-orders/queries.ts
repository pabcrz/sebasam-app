import { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
export { listActiveWorkers } from "@/features/workers/queries";

const workOrderInclude = {
  quote: {
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" as const } },
    },
  },
  assignments: {
    where: { status: { not: "CANCELLED" as const } },
    include: { worker: true },
  },
} as const;

function serializeWorkOrder<
  T extends {
    quote: {
      subtotalCents: unknown;
      taxCents: unknown;
      totalCents: unknown;
      items: Array<{
        quantity: unknown;
        unitPriceCents: unknown;
        totalCents: unknown;
      }>;
    };
  },
>(workOrder: T) {
  return {
    ...workOrder,
    quote: {
      ...workOrder.quote,
      subtotalCents: Number(workOrder.quote.subtotalCents),
      taxCents: Number(workOrder.quote.taxCents),
      totalCents: Number(workOrder.quote.totalCents),
      items: workOrder.quote.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPriceCents: Number(item.unitPriceCents),
        totalCents: Number(item.totalCents),
      })),
    },
  };
}

/** Returns all work orders for the admin list view (all statuses). */
export async function listWorkOrders() {
  await requireOperationalRole();

  const workOrders = await prisma.workOrder.findMany({
    include: workOrderInclude,
    orderBy: { createdAt: "desc" },
  });

  return workOrders.map(serializeWorkOrder);
}

/** Returns active work orders (ASSIGNED) — shown in the Trabajos section. */
export async function listActiveWorkOrders() {
  await requireOperationalRole();

  const workOrders = await prisma.workOrder.findMany({
    where: { status: WorkOrderStatus.ASSIGNED },
    include: workOrderInclude,
    orderBy: { createdAt: "desc" },
  });

  return workOrders.map(serializeWorkOrder);
}

/** Returns completed work orders (COMPLETED) — shown in the Notas section. */
export async function listCompletedWorkOrders() {
  await requireOperationalRole();

  const workOrders = await prisma.workOrder.findMany({
    where: { status: WorkOrderStatus.COMPLETED },
    include: workOrderInclude,
    orderBy: { completedAt: "desc" },
  });

  return workOrders.map(serializeWorkOrder);
}

/** Returns a single work order with all related data for the detail/manage view. */
export async function getWorkOrderById(workOrderId: string) {
  await requireOperationalRole();

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      ...workOrderInclude,
      executionRecords: {
        orderBy: { happenedAt: "desc" },
        include: { worker: true },
      },
      paymentRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });

  return workOrder ? serializeWorkOrder(workOrder) : null;
}
