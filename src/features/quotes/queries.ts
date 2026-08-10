import { Prisma, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { endOfDay } from "@/lib/filters";
import { quoteFilterSchema, quoteListPageSchema, type QuoteFilterInput } from "./schemas";
import { getQuotePaidTotals } from "@/features/payments/queries";

export async function getQuoteById(quoteId: string) {
  await requireOperationalRole();

  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      workOrder: {
        include: {
          assignments: { include: { worker: true } },
          executionRecords: { include: { worker: true }, orderBy: { happenedAt: "desc" } },
        },
      },
    },
  });
}

function findActiveSharedQuote(sharedQuotes: { expiresAt: Date; revokedAt: Date | null }[]) {
  const now = new Date();
  return sharedQuotes.find((sharedQuote) => sharedQuote.revokedAt === null && sharedQuote.expiresAt >= now) ?? null;
}

function buildQuoteWhere(input: unknown, options: { excludeWithActiveWorkOrder?: boolean }): Prisma.QuoteWhereInput | undefined {
  const parsed = quoteFilterSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : ({} as QuoteFilterInput);
  const where: Prisma.QuoteWhereInput = {};

  // Exclude quotes that live in Trabajos (ASSIGNED) or Notas (COMPLETED)
  if (options.excludeWithActiveWorkOrder) {
    where.NOT = {
      workOrder: { status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.COMPLETED] } },
    };
  }


  if (filters.status && Object.values(QuoteStatus).includes(filters.status as QuoteStatus)) {
    where.status = filters.status as QuoteStatus;
  } else if (!filters.showCancelled) {
    where.status = { not: QuoteStatus.CANCELLED };
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

  return Object.keys(where).length > 0 ? where : undefined;
}

const quoteListInclude = {
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
  sections: {
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  },
  workOrder: {
    include: {
      assignments: { include: { worker: true } },
      executionRecords: { include: { worker: true }, orderBy: { happenedAt: "desc" } },
    },
  },
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
} satisfies Prisma.QuoteInclude;

// The admin list needs operational controls, but not quote concepts. Keep this
// separate from quoteListInclude because Work Orders and Notas still need it.
const quoteSummaryInclude = {
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
  workOrder: {
    include: {
      assignments: { include: { worker: true } },
      executionRecords: { include: { worker: true }, orderBy: { happenedAt: "desc" } },
    },
  },
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
} satisfies Prisma.QuoteInclude;

const quoteDetailInclude = {
  customer: true,
  vehicle: true,
  items: { orderBy: { sortOrder: "asc" } },
  sections: {
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  },
} satisfies Prisma.QuoteInclude;

async function findQuotes(where: Prisma.QuoteWhereInput | undefined, pagination?: { skip: number; take: number }) {
  return prisma.quote.findMany({
    where,
    include: quoteListInclude,
    orderBy: pagination ? [{ createdAt: "desc" }, { id: "desc" }] : { createdAt: "desc" },
    ...pagination,
  });
}

async function findQuoteSummaries(where: Prisma.QuoteWhereInput | undefined, pagination: { skip: number; take: number }) {
  return prisma.quote.findMany({
    where,
    include: quoteSummaryInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...pagination,
  });
}

async function serializeQuotes(quotes: Awaited<ReturnType<typeof findQuotes>>) {
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
      sections: quote.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPriceCents: Number(item.unitPriceCents),
          totalCents: Number(item.totalCents),
        })),
      })),
      activeSharedQuote: findActiveSharedQuote(quote.sharedQuotes),
    };
  });
}

async function serializeQuoteSummaries(quotes: Awaited<ReturnType<typeof findQuoteSummaries>>) {
  const paidTotals = await getQuotePaidTotals(quotes.map((quote) => quote.id));

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
      activeSharedQuote: findActiveSharedQuote(quote.sharedQuotes),
    };
  });
}

export async function getQuoteDetail(quoteId: string) {
  await requireOperationalRole();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: quoteDetailInclude,
  });

  if (!quote) return null;

  const paidCents = (await getQuotePaidTotals([quote.id])).get(quote.id) ?? 0;
  const totalCents = Number(quote.totalCents);

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
    sections: quote.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPriceCents: Number(item.unitPriceCents),
        totalCents: Number(item.totalCents),
      })),
    })),
  };
}

export async function listQuotes(input: unknown = {}, options: { excludeWithActiveWorkOrder?: boolean } = {}) {
  await requireOperationalRole();
  return serializeQuotes(await findQuotes(buildQuoteWhere(input, options)));
}

export async function listPaginatedQuotes(input: unknown = {}, options: { excludeWithActiveWorkOrder?: boolean } = {}) {
  await requireOperationalRole();

  const pageInput = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>).page
    : undefined;
  const parsedPage = quoteListPageSchema.safeParse(pageInput);
  const page = parsedPage.success ? parsedPage.data : 1;
  const pageSize = 20;
  const quotes = await findQuoteSummaries(buildQuoteWhere(input, options), {
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  return {
    quotes: await serializeQuoteSummaries(quotes.slice(0, pageSize)),
    page,
    hasNextPage: quotes.length > pageSize,
  };
}

export type QuoteListSummary = Awaited<ReturnType<typeof listPaginatedQuotes>>["quotes"][number];
export type QuoteDetail = NonNullable<Awaited<ReturnType<typeof getQuoteDetail>>>;
