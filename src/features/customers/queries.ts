import { LedgerEntryType, LedgerMovementType, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerBalanceSummary } from "@/features/payments/domain";
import { customerSearchSchema } from "./schemas";

export type CustomerAccountStatement = {
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
    movements,
  };
}
