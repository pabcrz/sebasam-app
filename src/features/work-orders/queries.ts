import { prisma } from "@/lib/prisma";

export function listWorkOrders() {
  return prisma.workOrder.findMany({
    include: {
      quote: { include: { customer: true } },
      assignments: { include: { worker: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
