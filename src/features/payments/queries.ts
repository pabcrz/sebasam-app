import { PaymentStatus } from "@prisma/client";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
export async function getQuotePaidTotals(quoteIds: string[]): Promise<Map<string, number>> {
  await requireOperationalRole();

  if (quoteIds.length === 0) {
    return new Map();
  }

  const paidPayments = await prisma.payment.groupBy({
    by: ["quoteId"],
    where: { quoteId: { in: quoteIds }, status: PaymentStatus.PAID },
    _sum: { amountCents: true },
  });

  return new Map(paidPayments.map((payment) => [
    payment.quoteId,
    payment._sum.amountCents ?? 0,
  ]));
}
