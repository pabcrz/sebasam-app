import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

export async function listWorkOrders() {
  await requireOperationalRole();

  return prisma.workOrder.findMany({
    include: {
      quote: { include: { customer: true } },
      assignments: { include: { worker: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
