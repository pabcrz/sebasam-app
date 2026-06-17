import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export async function listCustomers() {
  await requireUser();

  return prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
}
