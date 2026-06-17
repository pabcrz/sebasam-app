import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export async function listWorkOrders() {
  await requireUser();

  return prisma.workOrder.findMany({
    include: {
      quote: { include: { customer: true } },
      assignments: { include: { worker: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
