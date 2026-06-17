import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { customerSearchSchema } from "./schemas";

export async function listCustomers(input: unknown = {}) {
  await requireOperationalRole();

  const { query } = customerSearchSchema.parse(input);
  const search = query || undefined;

  return prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 50,
  });
}

export async function getCustomerById(customerId: string) {
  await requireOperationalRole();

  return prisma.customer.findUnique({
    where: { id: customerId },
  });
}
