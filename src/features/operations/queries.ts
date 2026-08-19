import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

const workInclude = {
  master: { select: { id: true, displayName: true } },
  customer: { select: { id: true, name: true } },
  concepts: { orderBy: { sortOrder: "asc" as const } },
  convertedQuote: { select: { id: true, number: true, status: true } },
};

export async function listOperationalWorks() {
  await requireOperationalRole();
  return prisma.operationalWork.findMany({ include: workInclude, orderBy: { createdAt: "desc" } });
}

export async function getOperationalWorkById(id: string) {
  await requireOperationalRole();
  return prisma.operationalWork.findUnique({ where: { id }, include: workInclude });
}
