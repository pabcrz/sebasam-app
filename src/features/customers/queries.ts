import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerBalanceSummary } from "@/features/payments/domain";
import { customerSearchSchema } from "./schemas";

export type CustomerAccountStatement = {
  totalContractedCents: number;
  totalPaidCents: number;
  pendingBalanceCents: number;
  movements: Array<{
    id: string;
    createdAt: Date;
    type: string;
    amountCents: number;
    resultingBalanceCents: number;
    payment: {
      method: string;
      quote: {
        id: string;
        number: string;
      };
    };
  }>;
};

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
            { vehicles: { some: { plate: { contains: search, mode: "insensitive" } } } },
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

export async function getCustomerAccountStatement(customerId: string): Promise<CustomerAccountStatement> {
  await requireOperationalRole();

  const [summary, movements] = await Promise.all([
    getCustomerBalanceSummary(prisma, customerId),
    prisma.ledgerEntry.findMany({
      where: { customerId },
      include: {
        payment: {
          select: {
            method: true,
            quote: {
              select: { id: true, number: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  return { ...summary, movements };
}
