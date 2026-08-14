import crypto from "node:crypto";
import { QuoteDecisionOrigin, QuoteStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";

const SHARED_QUOTE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class SharedQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SharedQuoteError";
  }
}

export class SharedQuoteNotFoundError extends SharedQuoteError {
  constructor() {
    super("Shared quote not found.");
    this.name = "SharedQuoteNotFoundError";
  }
}

export class SharedQuoteExpiredError extends SharedQuoteError {
  constructor() {
    super("Shared quote has expired.");
    this.name = "SharedQuoteExpiredError";
  }
}

export class SharedQuoteRevokedError extends SharedQuoteError {
  constructor() {
    super("Shared quote has been revoked.");
    this.name = "SharedQuoteRevokedError";
  }
}

export class SharedQuoteOperationError extends SharedQuoteError {
  constructor(message: string) {
    super(message);
    this.name = "SharedQuoteOperationError";
  }
}

export class QuoteDecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteDecisionError";
  }
}

export function createSharedQuoteToken(): string {
  // Legacy token — kept for backward compatibility during migration.
  // New tokens are generated via createSharedQuoteSlug() using short slugs.
  return crypto.randomBytes(32).toString("hex");
}

export function createSharedQuoteSlug(quoteNumber: string): string {
  return generateSlug(quoteNumber);
}

export function createSharedQuoteExpirationDate(reference = new Date()): Date {
  return new Date(reference.getTime() + SHARED_QUOTE_TOKEN_TTL_MS);
}

const sharedQuoteInclude = {
  quote: {
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      sections: { 
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" } 
      },
      workOrder: { select: { status: true } },
    },
  },
} as const;

export async function getSharedQuoteByToken(token: string) {
  const sharedQuote = await prisma.sharedQuote.findUnique({
    where: { token },
    include: sharedQuoteInclude,
  });

  if (!sharedQuote) {
    throw new SharedQuoteNotFoundError();
  }

  if (sharedQuote.revokedAt) {
    throw new SharedQuoteRevokedError();
  }

  if (sharedQuote.expiresAt < new Date()) {
    throw new SharedQuoteExpiredError();
  }

  return sharedQuote;
}

export async function getActiveSharedQuoteForQuote(quoteId: string) {
  return prisma.sharedQuote.findFirst({
    where: {
      quoteId,
      revokedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

type TransactionClient = Prisma.TransactionClient;

function assertQuoteCanBeShared(quote: { status: QuoteStatus; items: { description: string; quantity: unknown; unitPriceCents: number }[] }) {
  if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.APPROVED) {
    throw new SharedQuoteOperationError("Quote cannot be shared in its current status.");
  }

  const hasCompleteItem = quote.items.some(
    (item) =>
      item.description.trim() !== "" &&
      Number(item.quantity) > 0 &&
      item.unitPriceCents >= 0,
  );

  if (!hasCompleteItem) {
    throw new SharedQuoteOperationError("Quote must have at least one complete item to be shared.");
  }
}

async function createSharedQuoteInTransaction(tx: TransactionClient, quoteId: string) {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!quote) {
    throw new SharedQuoteOperationError("Quote not found.");
  }

  assertQuoteCanBeShared(quote);

  const nextStatus = quote.status === QuoteStatus.DRAFT ? QuoteStatus.SENT : quote.status;

  const token = await generateUniqueSlug(quote.number, async (slug) => {
    const existing = await tx.sharedQuote.findUnique({ where: { token: slug }, select: { id: true } });
    return existing !== null;
  });

  const [sharedQuote] = await Promise.all([
    tx.sharedQuote.create({
      data: {
        token,
        quoteId: quote.id,
        expiresAt: createSharedQuoteExpirationDate(),
      },
    }),
    quote.status === QuoteStatus.DRAFT
      ? tx.quote.update({
          where: { id: quote.id },
          data: { status: nextStatus },
        })
      : Promise.resolve(),
  ]);

  return sharedQuote;
}

export async function createSharedQuoteForQuote(quoteId: string) {
  return prisma.$transaction(async (tx) => createSharedQuoteInTransaction(tx, quoteId));
}

export async function getOrCreateSharedQuoteForQuote(quoteId: string) {
  return prisma.$transaction(async (tx) => {
    const existingActive = await tx.sharedQuote.findFirst({
      where: {
        quoteId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingActive) {
      return existingActive;
    }

    return createSharedQuoteInTransaction(tx, quoteId);
  });
}

// --- Quote decision (accept / decline / authorize) ---

export async function acceptSharedQuote(token: string) {
  return prisma.$transaction(async (tx) => {
    const sharedQuote = await tx.sharedQuote.findFirst({
      where: { token, revokedAt: null, expiresAt: { gte: new Date() } },
      include: { quote: true },
    });

    if (!sharedQuote) {
      const existing = await tx.sharedQuote.findUnique({ where: { token } });
      if (!existing) throw new SharedQuoteNotFoundError();
      if (existing.revokedAt) throw new SharedQuoteRevokedError();
      throw new SharedQuoteExpiredError();
    }

    const result = await tx.quote.updateMany({
      where: { id: sharedQuote.quoteId, status: QuoteStatus.SENT },
      data: { status: QuoteStatus.APPROVED, approvedAt: new Date() },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("Solo se puede aceptar una cotización en estado enviado.");
    }

    return tx.quoteDecision.create({
      data: {
        quoteId: sharedQuote.quoteId,
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.CUSTOMER,
      },
    });
  });
}

export async function declineSharedQuote(token: string) {
  return prisma.$transaction(async (tx) => {
    const sharedQuote = await tx.sharedQuote.findFirst({
      where: { token, revokedAt: null, expiresAt: { gte: new Date() } },
      include: { quote: true },
    });

    if (!sharedQuote) {
      const existing = await tx.sharedQuote.findUnique({ where: { token } });
      if (!existing) throw new SharedQuoteNotFoundError();
      if (existing.revokedAt) throw new SharedQuoteRevokedError();
      throw new SharedQuoteExpiredError();
    }

    const result = await tx.quote.updateMany({
      where: { id: sharedQuote.quoteId, status: QuoteStatus.SENT },
      data: { status: QuoteStatus.REJECTED },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("Solo se puede declinar una cotización en estado enviado.");
    }

    return tx.quoteDecision.create({
      data: {
        quoteId: sharedQuote.quoteId,
        status: QuoteStatus.REJECTED,
        origin: QuoteDecisionOrigin.CUSTOMER,
      },
    });
  });
}

export async function authorizeQuote(quoteId: string, note: string, actorId?: string) {
  const trimmedNote = note.trim();

  if (trimmedNote.length === 0) {
    throw new QuoteDecisionError("La nota de autorización es obligatoria.");
  }

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId } });

    if (!quote) {
      throw new QuoteDecisionError("Cotización no encontrada.");
    }

    const result = await tx.quote.updateMany({
      where: { id: quoteId, status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.APPROVED, approvedAt: new Date() },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("Solo se puede autorizar una cotización en borrador o enviada.");
    }

    return tx.quoteDecision.create({
      data: {
        quoteId,
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.ADMIN,
        actorId: actorId ?? null,
        note: trimmedNote,
      },
    });
  });
}
