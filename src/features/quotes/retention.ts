import { Prisma } from "@/generated/prisma/client";
import { QuoteStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_RETENTION_DAYS = 30;
const TRASH_RETENTION_DAYS = 30;
const RETENTION_BATCH_SIZE = 100;

export type QuoteRetentionResult = {
  archived: number;
  trashed: number;
  purged: number;
  protected: number;
};

function daysBefore(reference: Date, days: number): Date {
  return new Date(reference.getTime() - days * DAY_IN_MS);
}

function daysAfter(reference: Date, days: number): Date {
  return new Date(reference.getTime() + days * DAY_IN_MS);
}

async function hasProtectedDependencies(tx: Prisma.TransactionClient, quoteId: string): Promise<boolean> {
  const dependencies = await Promise.all([
    tx.workOrder.count({ where: { quoteId } }),
    tx.payableNote.count({ where: { quoteId } }),
    tx.payment.count({ where: { quoteId } }),
    tx.paymentRequest.count({ where: { quoteId } }),
    tx.quoteDecision.count({ where: { quoteId } }),
    tx.quoteLifecycleEvent.count({ where: { quoteId } }),
    tx.quoteCommercialCorrection.count({ where: { quoteId } }),
    tx.settlementAgreement.count({ where: { quoteId } }),
  ]);

  return dependencies.some((count) => count > 0);
}

/** Reconciles quote archive, trash, and purge deadlines relative to commercial validUntil. */
export async function processQuoteRetention(now = new Date()): Promise<QuoteRetentionResult> {
  return prisma.$transaction(async (tx) => {
    const result: QuoteRetentionResult = { archived: 0, trashed: 0, purged: 0, protected: 0 };

    const expiredQuotes = await tx.quote.findMany({
      where: {
        status: { in: [QuoteStatus.SENT, QuoteStatus.APPROVED] },
        validUntil: { lte: now },
        deletedAt: null,
        workOrder: { is: null },
        payableNote: { is: null },
      },
      select: { id: true, status: true },
      orderBy: [{ validUntil: "asc" }, { id: "asc" }],
      take: RETENTION_BATCH_SIZE,
    });

    for (const quote of expiredQuotes) {
      const archived = await tx.quote.updateMany({
        where: {
          id: quote.id,
          status: quote.status,
          validUntil: { lte: now },
          deletedAt: null,
          workOrder: { is: null },
          payableNote: { is: null },
        },
        data: { status: QuoteStatus.ARCHIVED, retentionStartedAt: now },
      });
      if (archived.count !== 1) continue;

      await tx.sharedQuote.updateMany({
        where: { quoteId: quote.id, revokedAt: null },
        data: { revokedAt: now },
      });
      result.archived += 1;
    }

    const archiveDeadline = daysBefore(now, ARCHIVE_RETENTION_DAYS);
    const archivedQuotes = await tx.quote.findMany({
      where: {
        status: QuoteStatus.ARCHIVED,
        retentionStartedAt: { not: null },
        deletedAt: null,
        validUntil: { lte: archiveDeadline },
        workOrder: { is: null },
        payableNote: { is: null },
      },
      select: { id: true, validUntil: true },
      orderBy: [{ validUntil: "asc" }, { id: "asc" }],
      take: RETENTION_BATCH_SIZE,
    });

    for (const quote of archivedQuotes) {
      const trashedAt = daysAfter(quote.validUntil, ARCHIVE_RETENTION_DAYS);
      const trashed = await tx.quote.updateMany({
        where: {
          id: quote.id,
          status: QuoteStatus.ARCHIVED,
          retentionStartedAt: { not: null },
          deletedAt: null,
          validUntil: { lte: archiveDeadline },
          workOrder: { is: null },
          payableNote: { is: null },
        },
        data: { deletedAt: trashedAt },
      });
      result.trashed += trashed.count;
    }

    const purgeDeadline = daysBefore(now, ARCHIVE_RETENTION_DAYS + TRASH_RETENTION_DAYS);
    const trashedQuotes = await tx.quote.findMany({
      where: {
        status: QuoteStatus.ARCHIVED,
        retentionStartedAt: { not: null },
        deletedAt: { not: null },
        validUntil: { lte: purgeDeadline },
      },
      select: { id: true },
      orderBy: [{ validUntil: "asc" }, { id: "asc" }],
      take: RETENTION_BATCH_SIZE,
    });

    for (const quote of trashedQuotes) {
      if (await hasProtectedDependencies(tx, quote.id)) {
        result.protected += 1;
        continue;
      }

      await tx.quote.delete({ where: { id: quote.id } });
      result.purged += 1;
    }

    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
