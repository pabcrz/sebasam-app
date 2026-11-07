import { Prisma, QuoteStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { quoteFilterSchema, quoteListPageSchema, type QuoteFilterInput } from "./schemas";
import { getQuotePaidTotals } from "@/features/payments/queries";

export async function getQuoteById(quoteId: string) {
  await requireOperationalRole();

  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      payableNote: { select: { kind: true, status: true, paymentDueDate: true } },
      customerContact: true,
      customerFiscalProfile: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      sections: { 
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" } 
      },
      workOrder: {
        include: {
          assignments: { include: { worker: true } },
          executionRecords: { include: { worker: true }, orderBy: { happenedAt: "desc" } },
        },
      },
    },
  });
}

function findActiveSharedQuote<T extends { expiresAt: Date; revokedAt: Date | null }>(sharedQuotes: T[]): T | null {
  const now = new Date();
  return sharedQuotes.find((sharedQuote) => sharedQuote.revokedAt === null && sharedQuote.expiresAt >= now) ?? null;
}

type QuoteListOptions = { operationalQueue?: "quotes" };

function buildQuoteWhere(input: unknown, options: QuoteListOptions): Prisma.QuoteWhereInput | undefined {
  const parsed = quoteFilterSchema.safeParse(input);
  const filters = parsed.success ? parsed.data : ({} as QuoteFilterInput);
  const where: Prisma.QuoteWhereInput = {};
  const quoteQueueStatuses: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.APPROVED];

  if (options.operationalQueue === "quotes") {
    where.NOT = {
      workOrder: {
        status: {
          in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED],
        },
      },
    };
  }

  where.deletedAt = null;

  if (filters.status && Object.values(QuoteStatus).includes(filters.status as QuoteStatus)) {
    where.status = filters.status as QuoteStatus;
  } else if (options.operationalQueue === "quotes") {
    const includedStatuses = [...quoteQueueStatuses];
    if (filters.showCancelled) includedStatuses.push(QuoteStatus.CANCELLED);
    if (filters.showArchived) includedStatuses.push(QuoteStatus.ARCHIVED);
    where.status = { in: includedStatuses };
  } else {
    const hiddenStatuses: QuoteStatus[] = [];
    if (!filters.showCancelled) hiddenStatuses.push(QuoteStatus.CANCELLED);
    if (!filters.showArchived) hiddenStatuses.push(QuoteStatus.ARCHIVED);
    const validHiddenStatuses = hiddenStatuses.filter(Boolean);
    if (validHiddenStatuses.length > 0) where.status = { notIn: validHiddenStatuses };
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  const searchOrs: Prisma.QuoteWhereInput[] = [];

  if (filters.number) {
    searchOrs.push({
      OR: [
        { number: { contains: filters.number, mode: "insensitive" } },
        { folio: { contains: filters.number, mode: "insensitive" } },
      ],
    });
  }

  if (filters.plate) {
    const plateSearch = filters.plate;
    searchOrs.push({
      OR: [
        { vehicle: { plate: { contains: plateSearch, mode: "insensitive" } } },
        { vehicleSnapshot: { path: ["plate"], string_contains: plateSearch } },
      ],
    });
  }

  if (filters.economicNumber) {
    const ecoSearch = filters.economicNumber;
    searchOrs.push({
      OR: [
        { vehicle: { economicNumber: { contains: ecoSearch, mode: "insensitive" } } },
        { vehicleSnapshot: { path: ["economicNumber"], string_contains: ecoSearch } },
      ],
    });
  }

  if (searchOrs.length === 1) {
    where.OR = searchOrs[0].OR;
  } else if (searchOrs.length > 1) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      ...searchOrs,
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.operationalDate = {};
    if (filters.dateFrom) where.operationalDate.gte = filters.dateFrom;
    if (filters.dateTo) where.operationalDate.lte = filters.dateTo;
  }

  if (filters.hasWorkOrder === true) {
    where.workOrder = { isNot: null };
  } else if (filters.hasWorkOrder === false) {
    if (where.NOT) {
      where.NOT = Array.isArray(where.NOT)
        ? [...where.NOT, { workOrder: { isNot: null } }]
        : [where.NOT, { workOrder: { isNot: null } }];
    } else {
      where.NOT = { workOrder: { isNot: null } };
    }
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
  customerContact: true,
  customerFiscalProfile: true,
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
  payableNote: {
    select: { id: true, kind: true, status: true, paymentDueDate: true },
  },
} satisfies Prisma.QuoteInclude;

async function findQuotes(where: Prisma.QuoteWhereInput | undefined, pagination?: { skip: number; take: number }) {
  return prisma.quote.findMany({
    where,
    relationLoadStrategy: "join",
    include: quoteListInclude,
    orderBy: pagination ? [{ operationalDate: "desc" }, { id: "desc" }] : { operationalDate: "desc" },
    ...pagination,
  });
}

async function serializeQuotes(quotes: Awaited<ReturnType<typeof findQuotes>>) {
  const paidTotals = await getQuotePaidTotals(quotes.map((quote) => quote.id));

  // Serialize Prisma Decimal fields to plain numbers so Next.js Server→Client Component
  // serialization does not break with Turbopack.
  return quotes.map((quote) => {
    const totalCents = quote.totalCents === null ? null : Number(quote.totalCents);
    const paidCents = paidTotals.get(quote.id) ?? 0;

    if (totalCents !== null && paidCents > totalCents) {
      throw new Error(`Los pagos registrados exceden el total de la cotización ${quote.number}.`);
    }

    return {
      ...quote,
       subtotalCents: quote.subtotalCents === null ? null : Number(quote.subtotalCents),
       taxCents: quote.taxCents === null ? null : Number(quote.taxCents),
      totalCents,
      paidCents,
       remainingCents: totalCents === null ? null : totalCents - paidCents,
      items: quote.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
         unitPriceCents: item.unitPriceCents === null ? null : Number(item.unitPriceCents),
         totalCents: item.totalCents === null ? null : Number(item.totalCents),
      })),
      sections: quote.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
           unitPriceCents: item.unitPriceCents === null ? null : Number(item.unitPriceCents),
           totalCents: item.totalCents === null ? null : Number(item.totalCents),
        })),
      })),
      activeSharedQuote: findActiveSharedQuote(quote.sharedQuotes),
    };
  });
}

export async function listQuotes(input: unknown = {}, options: QuoteListOptions = {}) {
  await requireOperationalRole();
  return serializeQuotes(await findQuotes(buildQuoteWhere(input, options)));
}

const quoteIdsSchema = z.array(z.string().trim().min(1)).min(1);

/** Internal lookup for callers that already own the quote IDs to render. */
export async function listQuotesByIds(ids: readonly string[]) {
  await requireOperationalRole();

  const parsedIds = quoteIdsSchema.safeParse(ids);
  if (!parsedIds.success) return [];

  const uniqueIds = [...new Set(parsedIds.data)];
  return serializeQuotes(await findQuotes({ id: { in: uniqueIds }, deletedAt: null }));
}

export async function listPaginatedQuotes(input: unknown = {}, options: QuoteListOptions = {}) {
  await requireOperationalRole();

  const pageInput = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>).page
    : undefined;
  const parsedPage = quoteListPageSchema.safeParse(pageInput);
  const page = parsedPage.success ? parsedPage.data : 1;
  const pageSize = 20;
  const quotes = await findQuotes(buildQuoteWhere(input, options), {
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });

  return {
    quotes: await serializeQuotes(quotes.slice(0, pageSize)),
    page,
    hasNextPage: quotes.length > pageSize,
  };
}

export async function listArchivedEligibleQuotes() {
  await requireOperationalRole();
  return serializeQuotes(await findQuotes({
    status: QuoteStatus.ARCHIVED,
    deletedAt: null,
    retentionStartedAt: { not: null },
  }));
}

export async function listRecoverableTrashedQuotes(now = new Date()) {
  await requireOperationalRole();
  const trashStartedAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return serializeQuotes(await findQuotes({
    status: QuoteStatus.ARCHIVED,
    retentionStartedAt: { not: null },
    deletedAt: { gte: trashStartedAt, lte: now },
  }));
}

export type QuoteListSummary = Awaited<ReturnType<typeof listPaginatedQuotes>>["quotes"][number];
