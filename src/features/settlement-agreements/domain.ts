import { PaymentRequestStatus, Prisma, QuoteStatus, SettlementAgreementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCommercialQuote } from "@/features/quotes/lib/commercial-validation";

const ACTIVE_PAYMENT_REQUEST_STATUSES: PaymentRequestStatus[] = [
  PaymentRequestStatus.PENDING,
  PaymentRequestStatus.VIEWED,
  PaymentRequestStatus.FISCAL_DATA_REQUIRED,
  PaymentRequestStatus.READY_TO_PAY,
];

export type SettlementTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  agreementId: string | null;
};

type QuoteForSettlement = {
  id: string;
  status: QuoteStatus;
  isLocked: boolean;
  subtotalCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  taxEnabled: boolean;
  customerId: string | null;
  items: unknown[];
  sections: unknown[];
};

export class SettlementAgreementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementAgreementError";
  }
}

export function calculateSettlementTotals(
  quote: Pick<QuoteForSettlement, "subtotalCents" | "taxCents" | "totalCents" | "taxEnabled">,
  settlementBaseCents: number,
): Omit<SettlementTotals, "agreementId"> {
  if (!Number.isSafeInteger(settlementBaseCents) || settlementBaseCents <= 0) {
    throw new SettlementAgreementError("La base liquidable debe ser mayor que cero.");
  }
  const nominalSubtotalCents = quote.subtotalCents ?? 0;
  const nominalTaxCents = quote.taxCents ?? 0;
  const nominalTotalCents = quote.totalCents ?? 0;
  if (nominalSubtotalCents <= 0 || nominalTotalCents <= 0) {
    throw new SettlementAgreementError("La cotización debe tener totales nominales válidos.");
  }

  const taxCents = quote.taxEnabled
    ? Math.round(settlementBaseCents * (nominalTaxCents / nominalSubtotalCents))
    : 0;
  const totalCents = settlementBaseCents + taxCents;
  if (totalCents > nominalTotalCents) {
    throw new SettlementAgreementError("El total liquidable no puede exceder el total nominal.");
  }
  return { subtotalCents: settlementBaseCents, taxCents, totalCents };
}

export function getEffectiveSettlementTotals(
  quote: Pick<QuoteForSettlement, "subtotalCents" | "taxCents" | "totalCents">,
  agreement: { id: string; status: SettlementAgreementStatus; settlementBaseCents: number; settlementTaxCents: number; settlementTotalCents: number } | null | undefined,
): SettlementTotals {
  if (agreement?.status === SettlementAgreementStatus.ACTIVE) {
    return {
      subtotalCents: agreement.settlementBaseCents,
      taxCents: agreement.settlementTaxCents,
      totalCents: agreement.settlementTotalCents,
      agreementId: agreement.id,
    };
  }
  return {
    subtotalCents: quote.subtotalCents ?? 0,
    taxCents: quote.taxCents ?? 0,
    totalCents: quote.totalCents ?? 0,
    agreementId: null,
  };
}

export type UpsertSettlementAgreementInput = {
  quoteId: string;
  settlementBaseCents: number;
  reason: string;
  actorId: string;
};

async function invalidateActivePaymentRequests(tx: Prisma.TransactionClient, quoteId: string) {
  await tx.paymentRequest.updateMany({
    where: { quoteId, status: { in: ACTIVE_PAYMENT_REQUEST_STATUSES } },
    data: { status: PaymentRequestStatus.CANCELLED },
  });
}

export async function upsertSettlementAgreement(input: UpsertSettlementAgreementInput) {
  if (!input.reason.trim()) throw new SettlementAgreementError("El motivo del acuerdo es obligatorio.");
  if (!input.actorId.trim()) throw new SettlementAgreementError("El responsable del acuerdo es obligatorio.");

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: input.quoteId },
      include: { items: true, sections: { include: { items: true } }, settlementAgreement: { include: { revisions: true } } },
    });
    if (!quote) throw new SettlementAgreementError("La cotización no existe.");
    if (quote.isLocked || quote.status !== QuoteStatus.APPROVED) {
      throw new SettlementAgreementError("Solo se pueden acordar cotizaciones aprobadas y desbloqueadas.");
    }
    assertCommercialQuote(quote);
    const totals = calculateSettlementTotals(quote, input.settlementBaseCents);
    const revisionNumber = (quote.settlementAgreement?.revisions.length ?? 0) + 1;
    const data = {
      nominalSubtotalCents: quote.subtotalCents ?? 0,
      nominalTaxCents: quote.taxCents ?? 0,
      nominalTotalCents: quote.totalCents ?? 0,
      settlementBaseCents: totals.subtotalCents,
      settlementTaxCents: totals.taxCents,
      settlementTotalCents: totals.totalCents,
      reason: input.reason.trim(),
      actorId: input.actorId,
      status: SettlementAgreementStatus.ACTIVE,
      cancelledAt: null,
      cancelledById: null,
      cancellationReason: null,
    };
    const agreement = quote.settlementAgreement
      ? await tx.settlementAgreement.update({ where: { id: quote.settlementAgreement.id }, data })
      : await tx.settlementAgreement.create({ data: { quoteId: quote.id, ...data } });
    await tx.settlementAgreementRevision.create({
      data: {
        settlementAgreementId: agreement.id,
        revisionNumber,
        nominalSubtotalCents: data.nominalSubtotalCents,
        nominalTaxCents: data.nominalTaxCents,
        nominalTotalCents: data.nominalTotalCents,
        settlementBaseCents: data.settlementBaseCents,
        settlementTaxCents: data.settlementTaxCents,
        settlementTotalCents: data.settlementTotalCents,
        reason: data.reason,
        actorId: data.actorId,
      },
    });
    await invalidateActivePaymentRequests(tx, quote.id);
    return agreement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cancelSettlementAgreement(input: { quoteId: string; reason: string; actorId: string }) {
  if (!input.reason.trim()) throw new SettlementAgreementError("El motivo de la anulación es obligatorio.");
  return prisma.$transaction(async (tx) => {
    const agreement = await tx.settlementAgreement.findUnique({ where: { quoteId: input.quoteId } });
    if (!agreement) throw new SettlementAgreementError("No existe un acuerdo liquidable para esta cotización.");
    if (agreement.status === SettlementAgreementStatus.CANCELLED) return agreement;
    const updated = await tx.settlementAgreement.update({
      where: { id: agreement.id },
      data: { status: SettlementAgreementStatus.CANCELLED, cancelledAt: new Date(), cancelledById: input.actorId, cancellationReason: input.reason.trim() },
    });
    await invalidateActivePaymentRequests(tx, input.quoteId);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
