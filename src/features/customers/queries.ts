import { LedgerEntryType, LedgerMovementType, PaymentMethod, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerBalanceSummary } from "@/features/payments/domain";
import { customerSearchSchema } from "./schemas";

export type CustomerAccountStatement = {
  nominalContractedCents: number;
  totalContractedCents: number;
  totalPaidCents: number;
  pendingBalanceCents: number;
  availableCreditCents: number;
  movements: Array<{
    id: string;
    createdAt: Date;
    type: LedgerEntryType;
    movementType: LedgerMovementType;
    amountCents: number;
    resultingBalanceCents: number;
    reason: string | null;
    actor: {
      id: string;
      displayName: string;
    } | null;
    payment: {
      id: string;
      method: PaymentMethod;
      amountCents: number;
      operationKey: string;
      reversedAt: Date | null;
      quote: {
        id: string;
        number: string;
      } | null;
    } | null;
    paymentApplication: {
      id: string;
      amountCents: number;
      reversedAt: Date | null;
    } | null;
    workOrder: {
      id: string;
      number: string;
      status: string;
    } | null;
  }>;
};

export {
  type CustomerDeletionBlocker,
  getCustomerDeletionBlocker,
} from "./domain";

export async function listCustomers(input: unknown = {}) {
  await requireOperationalRole();

  const { query } = customerSearchSchema.parse(input);
  const search = query?.trim() || undefined;
  const digitsOnly = query ? query.replace(/\D/g, "") : "";

  const orConditions: Prisma.CustomerWhereInput[] = [];

  if (search) {
    orConditions.push(
      { name: { contains: search, mode: "insensitive" } },
      { commercialName: { contains: search, mode: "insensitive" } },
      { legalName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      {
        vehicles: {
          some: {
            OR: [
              { plate: { contains: search, mode: "insensitive" } },
              { economicNumber: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        fiscalProfiles: {
          some: {
            OR: [
              { businessName: { contains: search, mode: "insensitive" } },
              { taxId: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        contacts: {
          some: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    );

    if (digitsOnly.length >= 3) {
      orConditions.push(
        { phone: { contains: digitsOnly } },
        { contacts: { some: { phone: { contains: digitsOnly } } } },
      );
    }
  }

  return prisma.customer.findMany({
    where: search ? { OR: orConditions } : undefined,
    include: {
      contacts: {
        orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
      },
      fiscalProfiles: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
      _count: {
        select: {
          quotes: true,
          payments: true,
          paymentRequests: true,
          ledgerEntries: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 50,
  });
}

export async function getCustomerById(customerId: string) {
  await requireOperationalRole();

  return prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      contacts: {
        orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
      },
      fiscalProfiles: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
      vehicles: {
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });
}

export async function getCustomerAccountStatement(customerId: string): Promise<CustomerAccountStatement> {
  await requireOperationalRole();

  const [summary, rawMovements] = await Promise.all([
    getCustomerBalanceSummary(prisma, customerId),
    prisma.ledgerEntry.findMany({
      where: { customerId },
      include: {
        actor: {
          select: { id: true, displayName: true },
        },
        payment: {
          select: {
            id: true,
            method: true,
            amountCents: true,
            operationKey: true,
            reversedAt: true,
            quote: {
              select: { id: true, number: true },
            },
          },
        },
        paymentApplication: {
          select: {
            id: true,
            amountCents: true,
            reversedAt: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            number: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);

  // Compute running balance chronologically:
  // Charges (DEBIT) increase customer debt (+), Applications/Captures (CREDIT) reduce debt (-).
  let runningBalanceCents = 0;
  const movements = rawMovements.map((entry) => {
    if (entry.type === LedgerEntryType.DEBIT) {
      runningBalanceCents += entry.amountCents;
    } else {
      runningBalanceCents -= entry.amountCents;
    }

    return {
      id: entry.id,
      createdAt: entry.createdAt,
      type: entry.type,
      movementType: entry.movementType,
      amountCents: entry.amountCents,
      resultingBalanceCents: entry.resultingBalanceCents ?? Math.max(0, runningBalanceCents),
      reason: entry.reason,
      actor: entry.actor,
      payment: entry.payment,
      paymentApplication: entry.paymentApplication,
      workOrder: entry.workOrder,
    };
  });

  return {
    ...summary,
    movements: movements.reverse(),
  };
}
