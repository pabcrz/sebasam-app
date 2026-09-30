import crypto from "node:crypto";
import { Prisma, QuoteDecisionOrigin, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DOCUMENT_SLUG_SUFFIX_LENGTH,
  generateSlug,
  generateUniqueSlug,
} from "@/lib/slug";
import { assertCommercialQuote, CommercialQuoteValidationError } from "./lib/commercial-validation";
import { getNoteFinancialSummary } from "@/features/payments/domain";

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

function getSharedQuoteExpirationDate(sharedQuote: { createdAt: Date; expiresAt: Date }): Date {
  const issuanceLimit = createSharedQuoteExpirationDate(sharedQuote.createdAt);
  return sharedQuote.expiresAt < issuanceLimit ? sharedQuote.expiresAt : issuanceLimit;
}

function isEligibleArchivedQuote(quote: {
  status: QuoteStatus;
  workOrder: { id?: string; status: WorkOrderStatus } | null;
}): boolean {
  return quote.status === QuoteStatus.ARCHIVED && quote.workOrder === null;
}

function assertSharedQuoteAvailable(sharedQuote: {
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  quote: {
    status: QuoteStatus;
    deletedAt: Date | null;
    workOrder: { id?: string; status: WorkOrderStatus } | null;
  } | null;
}): void {
  if (!sharedQuote.quote || sharedQuote.quote.deletedAt != null || isEligibleArchivedQuote(sharedQuote.quote)) {
    throw new SharedQuoteNotFoundError();
  }

  if (sharedQuote.revokedAt) {
    throw new SharedQuoteRevokedError();
  }

  if (getSharedQuoteExpirationDate(sharedQuote).getTime() <= Date.now()) {
    throw new SharedQuoteExpiredError();
  }
}

const sharedQuoteInclude = {
  quote: {
    include: {
      customer: true,
      customerContact: true,
      customerFiscalProfile: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      sections: { 
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" } 
      },
      workOrder: { select: { id: true, status: true, folio: true } },
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

  assertSharedQuoteAvailable(sharedQuote);

  return sharedQuote;
}

export type SharedQuoteStatus = {
  revision: string;
  quoteStatus: QuoteStatus;
  workOrderStatus: WorkOrderStatus | null;
};

type SharedQuoteStatusInput = {
  expiresAt: Date;
  revokedAt: Date | null;
  quote: {
    id: string;
    status: QuoteStatus;
    updatedAt: Date;
    deletedAt: Date | null;
    workOrder: { status: WorkOrderStatus } | null;
  } | null;
};

export function getSharedQuoteStatusRevision(sharedQuote: SharedQuoteStatusInput): string {
  const workOrderStatus = sharedQuote.quote?.workOrder?.status ?? "none";
  return [
    sharedQuote.quote?.id ?? "missing",
    sharedQuote.quote?.status ?? "missing",
    sharedQuote.quote?.updatedAt?.getTime() ?? "missing",
    sharedQuote.quote?.deletedAt?.getTime() ?? "active",
    workOrderStatus,
    sharedQuote.revokedAt?.getTime() ?? "active",
    sharedQuote.expiresAt?.getTime() ?? "missing",
  ].join(":");
}

export async function getSharedQuoteStatusByToken(token: string): Promise<SharedQuoteStatus> {
  const sharedQuote = await prisma.sharedQuote.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      quote: {
        select: {
          id: true,
          status: true,
          updatedAt: true,
          deletedAt: true,
          workOrder: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!sharedQuote) {
    throw new SharedQuoteNotFoundError();
  }

  assertSharedQuoteAvailable(sharedQuote);

  return {
    revision: getSharedQuoteStatusRevision(sharedQuote),
    quoteStatus: sharedQuote.quote.status,
    workOrderStatus: sharedQuote.quote.workOrder?.status ?? null,
  };
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

export type NotePublicPaymentStatus = {
  paidCents: number;
  remainingCents: number;
  isSettled: boolean;
};

export async function getSharedQuotePaymentStatus(workOrderId: string): Promise<NotePublicPaymentStatus | null> {
  try {
    const summary = await getNoteFinancialSummary(prisma, workOrderId);
    return {
      paidCents: summary.appliedCents,
      remainingCents: summary.pendingBalanceCents,
      isSettled: summary.isSettled,
    };
  } catch {
    return null;
  }
}

type TransactionClient = Prisma.TransactionClient;

class CanonicalNoteSharedQuoteRaceError extends Error {
  constructor() {
    super("Canonical Note link was created concurrently.");
    this.name = "CanonicalNoteSharedQuoteRaceError";
  }
}

function assertQuoteCanBeShared(quote: { status: QuoteStatus; customerId: string | null; subtotalCents: number | null; discountCents: number | null; taxCents: number | null; totalCents: number | null; taxEnabled: boolean; items: { description: string; quantity: unknown; unitPriceCents: number | null }[] }) {
  if (quote.status !== QuoteStatus.SENT && quote.status !== QuoteStatus.APPROVED) {
    throw new SharedQuoteOperationError("Quote cannot be shared in its current status.");
  }

  try {
    assertCommercialQuote(quote, { allowStaleTotals: true });
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

  const prefix = quote.folio ?? quote.number;
  const token = await generateUniqueSlug(
    prefix,
    async (slug) => {
      const existing = await tx.sharedQuote.findUnique({ where: { token: slug }, select: { id: true } });
      return existing !== null;
    },
    5,
    DOCUMENT_SLUG_SUFFIX_LENGTH,
  );

  return tx.sharedQuote.create({
    data: {
      token,
      quoteId: quote.id,
      expiresAt: createSharedQuoteExpirationDate(),
    },
  });
}

async function ensureCanonicalNoteSharedQuote(tx: TransactionClient, quoteId: string) {
  const existing = await tx.sharedQuote.findFirst({
    where: { quoteId, isCanonical: true, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing && getSharedQuoteExpirationDate(existing).getTime() > Date.now()) return existing;
  if (existing) {
    await tx.sharedQuote.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, number: true, folio: true },
  });
  if (!quote) throw new SharedQuoteOperationError("Quote not found.");

  const prefix = quote.folio ?? quote.number;
  const token = await generateUniqueSlug(
    prefix,
    async (slug) => {
      const taken = await tx.sharedQuote.findUnique({ where: { token: slug }, select: { id: true } });
      return taken !== null;
    },
    5,
    DOCUMENT_SLUG_SUFFIX_LENGTH,
  );

  try {
    return await tx.sharedQuote.create({
      data: {
        token,
        quoteId: quote.id,
        isCanonical: true,
        expiresAt: createSharedQuoteExpirationDate(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new CanonicalNoteSharedQuoteRaceError();
    }
    throw error;
  }
}

export async function ensureSharedQuoteInTransaction(tx: TransactionClient, quoteId: string) {
  const workOrder = await tx.workOrder.findFirst({
    where: { quoteId },
    select: { status: true },
  });
  if (workOrder?.status === WorkOrderStatus.COMPLETED) {
    return ensureCanonicalNoteSharedQuote(tx, quoteId);
  }

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

  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, number: true, folio: true },
  });

  if (!quote) {
    throw new SharedQuoteOperationError("Quote not found.");
  }

  const prefix = quote.folio ?? quote.number;
  const token = await generateUniqueSlug(
    prefix,
    async (slug) => {
      const existing = await tx.sharedQuote.findUnique({ where: { token: slug }, select: { id: true } });
      return existing !== null;
    },
    5,
    DOCUMENT_SLUG_SUFFIX_LENGTH,
  );

  return tx.sharedQuote.create({
    data: {
      token,
      quoteId: quote.id,
      expiresAt: createSharedQuoteExpirationDate(),
    },
  });
}

export const MAX_SHARED_QUOTE_TRANSACTION_RETRIES = 3;

function isTokenP2002Error(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = (error.meta as { target?: string[] | string })?.target;
    if (Array.isArray(target)) {
      return target.includes("token");
    }
    if (typeof target === "string") {
      return target.includes("token");
    }
    return true;
  }
  return false;
}

export async function createSharedQuoteForQuote(quoteId: string) {
  for (let attempt = 0; attempt < MAX_SHARED_QUOTE_TRANSACTION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => createSharedQuoteInTransaction(tx, quoteId));
    } catch (error) {
      if (isTokenP2002Error(error) && attempt < MAX_SHARED_QUOTE_TRANSACTION_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new SharedQuoteOperationError("Failed to generate unique shared quote after retries.");
}

export async function getOrCreateSharedQuoteForQuote(quoteId: string) {
  for (let attempt = 0; attempt < MAX_SHARED_QUOTE_TRANSACTION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => ensureSharedQuoteInTransaction(tx, quoteId));
    } catch (error) {
      if (error instanceof CanonicalNoteSharedQuoteRaceError) {
        const winner = await prisma.sharedQuote.findFirst({
          where: { quoteId, isCanonical: true, revokedAt: null },
          orderBy: { createdAt: "asc" },
        });
        if (winner) return winner;
      }

      if (isTokenP2002Error(error) && attempt < MAX_SHARED_QUOTE_TRANSACTION_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new SharedQuoteOperationError("Failed to generate unique shared quote after retries.");
}

/** Revokes the durable public link of a completed Note with an audit trail. */
export async function revokeCanonicalNoteSharedQuote(
  quoteId: string,
  actorId: string,
  reason: string,
) {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new SharedQuoteOperationError("Revocation reason is required.");
  }

  return prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.findFirst({
      where: { quoteId },
      select: { status: true },
    });
    if (workOrder?.status !== WorkOrderStatus.COMPLETED) {
      throw new SharedQuoteOperationError("Only completed Notes have canonical links.");
    }

    const canonical = await tx.sharedQuote.findFirst({
      where: { quoteId, isCanonical: true, revokedAt: null },
    });
    if (!canonical) {
      throw new SharedQuoteOperationError("No hay enlace canónico activo para esta Nota.");
    }

    return tx.sharedQuote.update({
      where: { id: canonical.id },
      data: {
        revokedAt: new Date(),
        revokedByUserId: actorId,
        revocationReason: trimmedReason,
      },
    });
  });
}

// --- Quote decision (accept / decline / authorize) ---

export async function acceptSharedQuote(token: string, authorizedSectionIds?: string[]) {
  return prisma.$transaction(async (tx) => {
    const sharedQuote = await tx.sharedQuote.findFirst({
      where: { token, revokedAt: null, expiresAt: { gte: new Date() } },
      include: {
        quote: {
          include: {
            items: true,
            sections: { include: { items: true } },
            workOrder: true,
          },
        },
      },
    });

    if (!sharedQuote) {
      const existing = await tx.sharedQuote.findUnique({ where: { token } });
      if (!existing) throw new SharedQuoteNotFoundError();
      if (existing.revokedAt) throw new SharedQuoteRevokedError();
      throw new SharedQuoteExpiredError();
    }
    assertSharedQuoteAvailable(sharedQuote);

    if (sharedQuote.quote.isLocked) {
      throw new QuoteDecisionError("Este documento está bloqueado.");
    }

    if (sharedQuote.quote.workOrder?.status === "COMPLETED") {
      throw new QuoteDecisionError("Este documento es una nota y no puede ser aceptado como cotización.");
    }

    try {
      assertCommercialQuote(sharedQuote.quote, { allowStaleTotals: true });
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
      include: {
        quote: {
          include: {
            items: true,
            sections: { include: { items: true } },
            workOrder: true,
          },
        },
      },
    });

    if (!sharedQuote) {
      const existing = await tx.sharedQuote.findUnique({ where: { token } });
      if (!existing) throw new SharedQuoteNotFoundError();
      if (existing.revokedAt) throw new SharedQuoteRevokedError();
      throw new SharedQuoteExpiredError();
    }
    assertSharedQuoteAvailable(sharedQuote);

    if (sharedQuote.quote.isLocked) {
      throw new QuoteDecisionError("Este documento está bloqueado.");
    }

    if (sharedQuote.quote.workOrder?.status === "COMPLETED") {
      throw new QuoteDecisionError("Este documento es una nota y no puede ser declinado como cotización.");
    }

    if (sharedQuote.quote.status !== QuoteStatus.DRAFT && sharedQuote.quote.status !== QuoteStatus.SENT) {
      throw new QuoteDecisionError("Solo se puede declinar una cotización en borrador o enviada.");
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

    if (quote.isLocked) {
      throw new QuoteDecisionError("Este documento está bloqueado.");
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

    if (quote.isLocked) {
      throw new QuoteDecisionError("Este documento está bloqueado.");
    }
    
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
