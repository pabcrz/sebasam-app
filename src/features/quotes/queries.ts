import { prisma } from "@/lib/prisma";

export function listQuotes() {
  return prisma.quote.findMany({
    include: { customer: true, workOrder: true },
    orderBy: { createdAt: "desc" },
  });
}
