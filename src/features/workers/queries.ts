import { AssignmentStatus, UserRole, WorkerKind } from "@/generated/prisma/client";
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
    // Workload per row: assignments still open (not done or cancelled).
    include: {
      _count: {
        select: {
          assignments: {
            where: { status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED] } },
          },
        },
      },
    },
  });
}

export async function countWorkersByStatus() {
  await requireOperationalRole();

  const rows = await prisma.userProfile.groupBy({
    by: ["isActive"],
    where: { role: UserRole.WORKER },
    _count: { _all: true },
  });
  const active = rows.find((row) => row.isActive)?._count._all ?? 0;
  const inactive = rows.find((row) => !row.isActive)?._count._all ?? 0;
  return { ALL: active + inactive, ACTIVE: active, INACTIVE: inactive };
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

export async function listActiveMasters() {
  await requireOperationalRole();

  return prisma.userProfile.findMany({
    where: { role: UserRole.WORKER, isActive: true, workerKind: WorkerKind.MASTER },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
}
