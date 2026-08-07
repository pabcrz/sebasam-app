import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { workerSearchSchema } from "./schemas";

export async function listWorkers(input: unknown = {}) {
  await requireOperationalRole();

  const { query, status } = workerSearchSchema.parse(input);
  const search = query || undefined;

  return prisma.userProfile.findMany({
    where: {
      role: UserRole.WORKER,
      ...(status === "ALL" ? {} : { isActive: status === "ACTIVE" }),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
  });
}

export async function getWorkerById(workerId: string) {
  await requireOperationalRole();

  return prisma.userProfile.findFirst({
    where: { id: workerId, role: UserRole.WORKER },
  });
}

export async function listActiveWorkers() {
  await requireOperationalRole();

  return prisma.userProfile.findMany({
    where: {
      role: UserRole.WORKER,
      isActive: true,
      workerKind: { not: null },
    },
    orderBy: [{ workerKind: "asc" }, { displayName: "asc" }],
    select: {
      id: true,
      displayName: true,
      username: true,
      email: true,
      role: true,
      workerKind: true,
    },
  });
}
