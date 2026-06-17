import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export async function listQuotes() {
  await requireUser();

  return prisma.quote.findMany({
    include: { customer: true, workOrder: true },
    orderBy: { createdAt: "desc" },
  });
}
