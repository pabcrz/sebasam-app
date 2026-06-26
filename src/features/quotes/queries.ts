import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

export async function getQuoteById(quoteId: string) {
  await requireOperationalRole();

  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      workOrder: true,
    },
  });
}

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
