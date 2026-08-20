import crypto from "node:crypto";
import { QuoteDecisionOrigin, QuoteStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";
import { assertCommercialQuote, CommercialQuoteValidationError } from "./lib/commercial-validation";

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

function assertQuoteCanBeShared(quote: { status: QuoteStatus; customerId: string | null; subtotalCents: number | null; discountCents: number | null; taxCents: number | null; totalCents: number | null; taxEnabled: boolean; items: { description: string; quantity: unknown; unitPriceCents: number | null }[] }) {
  if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.APPROVED) {
    throw new SharedQuoteOperationError("Quote cannot be shared in its current status.");
  }

  try {
    assertCommercialQuote(quote);
  } catch (error) {
    if (error instanceof CommercialQuoteValidationError) {
      throw new SharedQuoteOperationError(error.message);
    }
    throw error;
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

  const token = await generateUniqueSlug(quote.number, async (slug) => {
    const existing = await tx.sharedQuote.findUnique({ where: { token: slug }, select: { id: true } });
    return existing !== null;
  });

  return tx.sharedQuote.create({
    data: {
      token,
      quoteId: quote.id,
      expiresAt: createSharedQuoteExpirationDate(),
    },
  });
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

export async function acceptSharedQuote(token: string, authorizedSectionIds?: string[]) {
  return prisma.$transaction(async (tx) => {
    const sharedQuote = await tx.sharedQuote.findFirst({
      where: { token, revokedAt: null, expiresAt: { gte: new Date() } },
      include: { quote: { include: { items: true, sections: { include: { items: true } } } } },
    });

    if (!sharedQuote) {
      const existing = await tx.sharedQuote.findUnique({ where: { token } });
      if (!existing) throw new SharedQuoteNotFoundError();
      if (existing.revokedAt) throw new SharedQuoteRevokedError();
      throw new SharedQuoteExpiredError();
    }

    try {
      assertCommercialQuote(sharedQuote.quote);
    } catch (error) {
      if (error instanceof CommercialQuoteValidationError) throw new QuoteDecisionError(error.message);
      throw error;
    }

    const result = await tx.quote.updateMany({
      where: { id: sharedQuote.quoteId, status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.APPROVED, approvedAt: new Date() },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("Solo se puede aceptar una cotización en estado borrador o enviada.");
    }

    const sectionsToAuthorize = authorizedSectionIds ?? sharedQuote.quote.sections?.map(s => s.id) ?? [];

    if (sectionsToAuthorize.length > 0) {
      await tx.quoteSection.updateMany({
        where: { quoteId: sharedQuote.quoteId, id: { in: sectionsToAuthorize } },
        data: { isAuthorized: true },
      });
    }

    return tx.quoteDecision.create({
      data: {
        quoteId: sharedQuote.quoteId,
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.CUSTOMER,
        authorizedSectionIds: sectionsToAuthorize,
      },
    });
  });
}

export async function declineSharedQuote(token: string) {
  return prisma.$transaction(async (tx) => {
    const sharedQuote = await tx.sharedQuote.findFirst({
      where: { token, revokedAt: null, expiresAt: { gte: new Date() } },
      include: { quote: { include: { items: true, sections: { include: { items: true } } } } },
    });

    if (!sharedQuote) {
      const existing = await tx.sharedQuote.findUnique({ where: { token } });
      if (!existing) throw new SharedQuoteNotFoundError();
      if (existing.revokedAt) throw new SharedQuoteRevokedError();
      throw new SharedQuoteExpiredError();
    }

    if (sharedQuote.quote.status !== QuoteStatus.SENT) {
      throw new QuoteDecisionError("Solo se puede declinar una cotización enviada.");
    }

    const result = await tx.quote.updateMany({
      where: { id: sharedQuote.quoteId, status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.REJECTED },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("Solo se puede declinar una cotización en estado borrador o enviada.");
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

export async function authorizeQuote(quoteId: string, note: string, actorId?: string, authorizedSectionIds?: string[]) {
  const trimmedNote = note.trim();

  if (trimmedNote.length === 0) {
    throw new QuoteDecisionError("La nota de autorización es obligatoria.");
  }

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { items: true, sections: { include: { items: true } } } });

    if (!quote) {
      throw new QuoteDecisionError("Cotización no encontrada.");
    }

    try {
      assertCommercialQuote(quote);
    } catch (error) {
      if (error instanceof CommercialQuoteValidationError) throw new QuoteDecisionError(error.message);
      throw error;
    }

    const result = await tx.quote.updateMany({
      where: { id: quoteId, status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.APPROVED, approvedAt: new Date() },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("Solo se puede autorizar una cotización en borrador o enviada.");
    }

    const sectionsToAuthorize = authorizedSectionIds ?? quote.sections?.map(s => s.id) ?? [];

    if (sectionsToAuthorize.length > 0) {
      await tx.quoteSection.updateMany({
        where: { quoteId, id: { in: sectionsToAuthorize } },
        data: { isAuthorized: true },
      });
    }

    return tx.quoteDecision.create({
      data: {
        quoteId,
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.ADMIN,
        actorId: actorId ?? null,
        note: trimmedNote,
        authorizedSectionIds: sectionsToAuthorize,
      },
    });
  });
}

export async function correctQuoteDecision(quoteId: string, nextStatus: "APPROVED" | "REJECTED" | "DRAFT", actorId: string) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { workOrder: true }
    });

    if (!quote) throw new QuoteDecisionError("Cotización no encontrada.");
    
    if (quote.status !== QuoteStatus.APPROVED && quote.status !== QuoteStatus.REJECTED) {
      throw new QuoteDecisionError("Solo se pueden corregir cotizaciones aprobadas o rechazadas.");
    }

    if (quote.status === nextStatus) {
      throw new QuoteDecisionError(`La cotización ya está en estado ${nextStatus}.`);
    }

    if (quote.workOrder) {
      throw new QuoteDecisionError("No se puede cambiar la decisión de una cotización con una orden de trabajo activa.");
    }

    const previousState = quote.status;
    const approvedAt = nextStatus === QuoteStatus.APPROVED ? new Date() : null;

    const result = await tx.quote.updateMany({
      where: { id: quoteId, status: previousState },
      data: { status: nextStatus, approvedAt },
    });

    if (result.count !== 1) {
      throw new QuoteDecisionError("El estado de la cotización cambió. Recarga e intenta de nuevo.");
    }

    if (nextStatus === QuoteStatus.APPROVED) {
      await tx.quoteSection.updateMany({
        where: { quoteId },
        data: { isAuthorized: true },
      });
    }

    await tx.quoteLifecycleEvent.create({
      data: {
        quoteId,
        previousState,
        nextState: nextStatus,
        actorId,
        reason: "Corrección manual de decisión",
      }
    });

    await tx.quoteDecision.create({
      data: {
        quoteId,
        status: nextStatus,
        origin: QuoteDecisionOrigin.ADMIN,
        actorId,
        note: "Corrección manual de decisión",
      }
    });
  });
}
