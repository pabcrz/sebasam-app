import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

export async function listCustomers() {
  await requireOperationalRole();

  return prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
}
