import { prisma } from "@/lib/prisma";

export function listCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
}
