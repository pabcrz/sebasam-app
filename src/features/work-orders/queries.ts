import { WorkOrderStatus } from \"@prisma/client\";
import { prisma } from \"@/lib/prisma\";
import { requireOperationalRole } from \"@/lib/auth/session\";
export { listActiveWorkers } from \"@/features/workers/queries\";

// Full include shape used by both active and completed work order views
const workOrderInclude = {
  quote: {
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: \"asc\" as const } },
    },
  },
  assignments: {
    where: { status: { not: \"CANCELLED\" as const } },
    include: { worker: true },
  },
} as const;

/** Returns all work orders for the admin list view (all statuses). */
export async function listWorkOrders() {
  await requireOperationalRole();

  return prisma.workOrder.findMany({
    include: workOrderInclude,
    orderBy: { createdAt: \"desc\" },
  });
}

/** Returns active work orders (ASSIGNED) — shown in the Trabajos section. */
export async function listActiveWorkOrders() {
  await requireOperationalRole();

  return prisma.workOrder.findMany({
    where: { status: WorkOrderStatus.ASSIGNED },
    include: workOrderInclude,
    orderBy: { createdAt: \"desc\" },
  });
}

/** Returns completed work orders (COMPLETED) — shown in the Notas section. */
export async function listCompletedWorkOrders() {
  await requireOperationalRole();

  return prisma.workOrder.findMany({
    where: { status: WorkOrderStatus.COMPLETED },
    include: workOrderInclude,
    orderBy: { completedAt: \"desc\" },
  });
}

/** Returns a single work order with all related data for the detail/manage view. */
export async function getWorkOrderById(workOrderId: string) {
  await requireOperationalRole();

  return prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      ...workOrderInclude,
      executionRecords: {
        orderBy: { happenedAt: \"desc\" },
        include: { worker: true },
      },
      paymentRequests: {
        orderBy: { createdAt: \"desc\" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });
}
