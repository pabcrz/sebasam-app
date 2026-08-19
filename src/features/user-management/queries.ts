import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";

export async function listUsers() {
  await requireSuperAdmin();

  return prisma.userProfile.findMany({
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });
}
