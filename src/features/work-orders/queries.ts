import { AssignmentStatus, PaymentStatus, Prisma, WorkerKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { assertOperationalClosureQuote } from "./operational-validation";
import { WorkOrderOperationError } from "./domain";
export { listActiveWorkers } from "@/features/workers/queries";

const workOrderInclude = {
  quote: {
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" as const } },
      sections: { orderBy: { sortOrder: "asc" as const }, include: { items: { orderBy: { sortOrder: "asc" as const } } } },
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
      sections?: Array<{ items: Array<{ quantity: unknown; unitPriceCents: unknown; totalCents: unknown }> }>;
    };
  },
>(workOrder: T) {
  return {
    ...workOrder,
    quote: {
      ...workOrder.quote,
      subtotalCents: workOrder.quote.subtotalCents == null ? null : Number(workOrder.quote.subtotalCents),
      taxCents: workOrder.quote.taxCents == null ? null : Number(workOrder.quote.taxCents),
      totalCents: workOrder.quote.totalCents == null ? null : Number(workOrder.quote.totalCents),
      items: workOrder.quote.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
        totalCents: item.totalCents == null ? null : Number(item.totalCents),
      })),
      sections: workOrder.quote.sections?.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
          totalCents: item.totalCents == null ? null : Number(item.totalCents),
        })),
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

/** Returns active work orders shown in the Trabajos section. */
export async function listActiveWorkOrders() {
  await requireOperationalRole();

  const workOrders = await prisma.workOrder.findMany({
    where: { status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] } },
    include: workOrderInclude,
    orderBy: { createdAt: "desc" },
  });

  return workOrders.map(serializeWorkOrder);
}

/** Returns completed work orders (COMPLETED) — shown in the Notas section. */
export async function listCompletedWorkOrders(input: { start: Date; end: Date; payment: "all" | "pending" | "paid"; assignee: "all" | "workshop" | string; page: number }) {
  await requireOperationalRole();
  const pageSize = 20;
  const balance = Prisma.sql`q."totalCents" - COALESCE(SUM(p."amountCents") FILTER (WHERE p.status::text = ${PaymentStatus.PAID}), 0)`;
  const paymentFilter = input.payment === "pending" ? Prisma.sql`HAVING ${balance} > 0` : input.payment === "paid" ? Prisma.sql`HAVING ${balance} = 0` : Prisma.empty;
  const assigneeFilter = input.assignee === "all"
    ? Prisma.empty
    : input.assignee === "workshop"
      ? Prisma.sql`AND wo."isSpecial" = true`
      : Prisma.sql`AND EXISTS (
        SELECT 1 FROM "WorkAssignment" wa
        JOIN "UserProfile" worker ON worker.id = wa."workerId"
        WHERE wa."workOrderId" = wo.id
          AND wa.status::text <> ${AssignmentStatus.CANCELLED}
          AND worker."workerKind"::text = ${WorkerKind.MASTER}
          AND worker.id = ${input.assignee}
      )`;
  const eligible = await prisma.$queryRaw<Array<{ id: string; paidCents: bigint }>>(Prisma.sql`
    SELECT wo.id, COALESCE(SUM(p."amountCents") FILTER (WHERE p.status::text = ${PaymentStatus.PAID}), 0) AS "paidCents"
    FROM "WorkOrder" wo JOIN "Quote" q ON q.id = wo."quoteId" LEFT JOIN "Payment" p ON p."quoteId" = q.id
    WHERE wo.status::text = ${WorkOrderStatus.COMPLETED} AND wo."completedAt" >= ${input.start} AND wo."completedAt" < ${input.end} ${assigneeFilter}
    GROUP BY wo.id, wo."completedAt", q."totalCents" ${paymentFilter}
    ORDER BY wo."completedAt" DESC, wo.id DESC LIMIT ${pageSize + 1} OFFSET ${(input.page - 1) * pageSize}`);
  const pageRows = eligible.slice(0, pageSize);
  if (pageRows.length === 0) return { page: input.page, hasNextPage: false, workOrders: [] };
  const workOrders = await prisma.workOrder.findMany({
    where: { id: { in: pageRows.map(({ id }) => id) } },
    include: workOrderInclude,
  });
  const byId = new Map(workOrders.map((wo) => [wo.id, wo]));
  return { page: input.page, hasNextPage: eligible.length > pageSize, workOrders: pageRows.flatMap(({ id, paidCents }) => {
    const wo = byId.get(id); if (!wo) return [];
    const serialized = serializeWorkOrder(wo);
    const totalCents = Number(wo.quote.totalCents);
    return [{
      ...serialized,
      quote: { ...serialized.quote, paidCents: Number(paidCents), remainingCents: totalCents - Number(paidCents) },
    }];
  }) };
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

export async function getCompletedWorkOrderById(workOrderId: string) {
  await requireOperationalRole();

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, status: WorkOrderStatus.COMPLETED },
    include: workOrderInclude,
  });

  if (!workOrder) return null;

  try {
    assertOperationalClosureQuote(workOrder.quote);
  } catch (error) {
    if (error instanceof WorkOrderOperationError) return null;
    throw error;
  }

  return serializeWorkOrder(workOrder);
}
