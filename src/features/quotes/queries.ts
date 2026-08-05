import { Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { endOfDay } from "@/lib/filters";
import { quoteFilterSchema, type QuoteFilterInput } from "./schemas";
import { getQuotePaidTotals } from "@/features/payments/queries";

export async function getQuoteById(quoteId: string) {
  await requireOperationalRole();

  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      workOrder: true,
    },
  });
}

function findActiveSharedQuote(sharedQuotes: { expiresAt: Date; revokedAt: Date | null }[]) {
  const now = new Date();
  return sharedQuotes.find((sharedQuote) => sharedQuote.revokedAt === null && sharedQuote.expiresAt >= now) ?? null;
}

export async function listQuotes(input: unknown = {}) {
  await requireOperationalRole();

  const parsed = quoteFilterSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : ({} as QuoteFilterInput);
  const where: Prisma.QuoteWhereInput = {};

  if (filters.status && Object.values(QuoteStatus).includes(filters.status as QuoteStatus)) {
    where.status = filters.status as QuoteStatus;
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.number) {
    where.number = { contains: filters.number, mode: "insensitive" };
  }

  if (filters.plate) {
    const plateSearch = filters.plate;
    where.OR = [
      { vehicle: { plate: { contains: plateSearch, mode: "insensitive" } } },
      { vehicleSnapshot: { path: ["plate"], string_contains: plateSearch, mode: "insensitive" } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = endOfDay(filters.dateTo);
  }

  const quotes = await prisma.quote.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      customer: {
        include: {
          fiscalProfiles: {
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
            take: 1,
            select: {
              id: true,
              businessName: true,
              taxId: true,
            },
          },
        },
      },
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      workOrder: true,
      sharedQuotes: true,
      paymentRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          requiresInvoice: true,
          customerFiscalProfileId: true,
          fiscalSnapshot: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const paidTotals = await getQuotePaidTotals(quotes.map((quote) => quote.id));

  // Serialize Prisma Decimal fields to plain numbers so Next.js Server→Client Component
  // serialization does not break with Turbopack.
  return quotes.map((quote) => {
    const totalCents = Number(quote.totalCents);
    const paidCents = paidTotals.get(quote.id) ?? 0;

    if (paidCents > totalCents) {
      throw new Error(`Los pagos registrados exceden el total de la cotización ${quote.number}.`);
    }

    return {
      ...quote,
      subtotalCents: Number(quote.subtotalCents),
      taxCents: Number(quote.taxCents),
      totalCents,
      paidCents,
      remainingCents: totalCents - paidCents,
      items: quote.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPriceCents: Number(item.unitPriceCents),
        totalCents: Number(item.totalCents),
      })),
      activeSharedQuote: findActiveSharedQuote(quote.sharedQuotes),
    };
  });
}
