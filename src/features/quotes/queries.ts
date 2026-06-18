import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

export async function listQuotes() {
  await requireOperationalRole();

  return prisma.quote.findMany({
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      workOrder: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
