import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

export async function listQuotes() {
  await requireOperationalRole();

  return prisma.quote.findMany({
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}
