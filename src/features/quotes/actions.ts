"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  LedgerEntryType,
  LedgerMovementType,
  PaymentRequestStatus,
  PaymentStatus,
  Prisma,
  QuoteStatus,
  SettlementAgreementStatus,
  WorkOrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole, requireAdmin } from "@/lib/auth/session";
import { measureServerTiming, recordServerTiming } from "@/lib/server-timing";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { createVehicleSnapshot } from "@/features/vehicles/schemas";
import {
  quoteDraftFormInputSchema,
  quoteDraftInputSchema,
  quoteLifecycleReasonSchema,
} from "./schemas";
import {
  calculateItemTotalCents,
  createQuoteValidUntil,
} from "./lib/calculate";
import { isQuoteEditable } from "./lib/editability";
import { assertCommercialQuote, CommercialQuoteValidationError } from "./lib/commercial-validation";
import { normalizeOperationalDate } from "./lib/operational-date";
import { nextQuoteNumber, nextWorkOrderNumber, withQuoteNumberRetry } from "./lib/sequence";
import { lockPaymentMutationScope } from "@/features/payments/domain";
import {
  QuoteDecisionError,
  acceptSharedQuote,
  declineSharedQuote,
  authorizeQuote,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
  SharedQuoteNotFoundError,
  correctQuoteDecision,
  getOrCreateSharedQuoteForQuote,
  ensureSharedQuoteInTransaction,
} from "./domain";

const quotesPath = "/admin/quotes";
const genericQuoteFormValidationError = "Revisa los datos e intenta de nuevo.";

function quoteFormValidationError(issues: Array<{ message: string }>) {
  const actionableIssue = issues.find(({ message }) =>
    message.startsWith("Selecciona ") || message.startsWith("El año "),
  );

  return actionableIssue?.message ?? genericQuoteFormValidationError;
}

import {
  buildVehicleInput,
  draftTotals,
  hasVehicleData,
  nullableOptional,
  quoteFormDataToInput,
} from "./quote-helpers";
import { resolveQuoteSnapshots } from "./lib/quote-snapshots";

async function createQuoteAuthorized(input: unknown) {
  const data = quoteDraftInputSchema.parse(input);
  const totals = draftTotals(data);
  const validUntil = createQuoteValidUntil();
  const operationalDate = normalizeOperationalDate(data.operationalDate);

  return withQuoteNumberRetry(() => prisma.$transaction(async (tx) => {
    const quoteId = randomUUID();
    const quoteNumber = await nextQuoteNumber(tx);
    const hasVehicle = hasVehicleData(data.vehicle);
    const shouldLinkVehicle = Boolean(data.customerId && hasVehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = hasVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    const { customerSnapshot, contactSnapshot } = await resolveQuoteSnapshots(
      tx,
      data.customerId,
      data.customerContactId,
      data.customerFiscalProfileId,
    );

    const sectionData = data.sections.map((section, sIndex) => ({
      name: section.name,
      isAuthorized: false,
      sortOrder: sIndex,
    }));

    const createdQuote = await tx.quote.create({
      data: {
        id: quoteId,
        customerId: data.customerId ?? null,
        vehicleId: vehicle?.id ?? null,
        customerContactId: data.customerContactId ?? null,
        customerFiscalProfileId: data.customerFiscalProfileId ?? null,
        vehicleSnapshot,
        customerSnapshot,
        contactSnapshot,
        number: quoteNumber,
        status: QuoteStatus.DRAFT,
        approvedAt: null,
        title: data.title,
        description: nullableOptional(data.description),
        administrative: data.administrative,
        taxEnabled: data.taxEnabled,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents ?? data.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        operationalDate,
        validUntil,
        sections: { create: sectionData },
      },
      include: { sections: true },
    });

    const itemsToCreate: Prisma.QuoteItemCreateManyInput[] = [];
    data.sections.forEach((sectionInput, sIndex) => {
      const createdSection = createdQuote.sections.find((s) => s.sortOrder === sIndex);
      if (createdSection) {
        sectionInput.items.forEach((item, iIndex) => {
          itemsToCreate.push({
            quoteId: createdQuote.id,
            sectionId: createdSection.id,
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents ?? null,
            totalCents: item.unitPriceCents === undefined ? null : calculateItemTotalCents(item.quantity, item.unitPriceCents),
            includeInPayroll: item.type === "OTHER" ? Boolean(item.includeInPayroll) : item.type === "LABOR",
            customRatePercent: item.type === "OTHER" && item.includeInPayroll ? (item.customRatePercent ?? 40) : (item.customRatePercent ?? null),
            sortOrder: iIndex,
          });
        });
      }
    });

    if (itemsToCreate.length > 0) {
      await tx.quoteItem.createMany({ data: itemsToCreate });
    }

    await ensureSharedQuoteInTransaction(tx, createdQuote.id);

    return createdQuote;
  }));
}

export async function createQuote(input: unknown) {
  await requireOperationalRole();
  return createQuoteAuthorized(input);
}

export type QuoteFormActionState = { error?: string; success?: boolean };

export async function createQuoteFromWorkspace(
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  const parsed = quoteDraftFormInputSchema.safeParse(quoteFormDataToInput(formData));
  if (!parsed.success) return { error: quoteFormValidationError(parsed.error.issues) };

  try {
    await createQuote(parsed.data);
  } catch {
    return { error: "No se pudo crear la cotización. Intenta de nuevo." };
  }

  revalidatePath(quotesPath);
  return { success: true };
}

export async function createQuoteFromForm(
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  await requireOperationalRole();

  const parsed = quoteDraftFormInputSchema.safeParse(quoteFormDataToInput(formData));

  if (!parsed.success) {
    return { error: quoteFormValidationError(parsed.error.issues) };
  }

  try {
    await createQuoteAuthorized(parsed.data);
  } catch {
    return { error: "No se pudo crear la cotización. Intenta de nuevo." };
  }
  redirect(`${quotesPath}?created=1`);
}

export async function updateDraftQuote(quoteId: string, input: unknown) {
  await requireOperationalRole();

  const data = quoteDraftInputSchema.parse(input);
  const requestedOperationalDate = data.operationalDate === undefined
    ? undefined
    : normalizeOperationalDate(data.operationalDate);
  const sectionData = data.sections.map((section, sIndex) => ({
    name: section.name,
    isAuthorized: section.isAuthorized ?? false,
    sortOrder: sIndex,
  }));

  const totals = draftTotals(data);

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, workOrder: true },
    });

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (!isQuoteEditable(quote)) {
      throw new Error("This quote is not editable.");
    }

    if (
      requestedOperationalDate &&
      quote.status !== QuoteStatus.DRAFT &&
      requestedOperationalDate.getTime() !== quote.operationalDate.getTime()
    ) {
      throw new Error("Only draft quotes can change their operational date.");
    }

    const paidTotals = await tx.payment.aggregate({
      where: { quoteId, status: PaymentStatus.PAID },
      _sum: { amountCents: true },
    });
    const paidCents = Number(paidTotals._sum.amountCents ?? 0);

    // This form always replaces quote items and recalculates totals. We must ensure
    // the new total is not less than what has already been paid.
    if (totals.totalCents !== null && paidCents > totals.totalCents) {
      throw new Error(`Esta cotización ya tiene ${paidCents / 100} abonados, el nuevo total no puede ser menor a esa cantidad.`);
    }

    const hasVehicle = hasVehicleData(data.vehicle);
    const shouldLinkVehicle = Boolean(data.customerId && hasVehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = hasVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;
    const { customerSnapshot, contactSnapshot } = await resolveQuoteSnapshots(
      tx,
      data.customerId,
      data.customerContactId,
      data.customerFiscalProfileId,
    );

    await tx.quoteSection.deleteMany({ where: { quoteId } });
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    const updatedQuote = await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: data.customerId ?? null,
        vehicleId: vehicle?.id ?? null,
        customerContactId: data.customerContactId ?? null,
        customerFiscalProfileId: data.customerFiscalProfileId ?? null,
        vehicleSnapshot,
        customerSnapshot,
        contactSnapshot,
        title: data.title,
        description: nullableOptional(data.description),
        administrative: data.administrative,
        taxEnabled: data.taxEnabled,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents ?? data.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
...(quote.status === QuoteStatus.DRAFT && requestedOperationalDate ? { operationalDate: requestedOperationalDate } : {}),
        status: QuoteStatus.DRAFT,
        approvedAt: null,
        sections: { create: sectionData },
      },
      include: { sections: true },
    });

    const itemsToCreate: Prisma.QuoteItemCreateManyInput[] = [];
    data.sections.forEach((sectionInput, sIndex) => {
      const createdSection = updatedQuote.sections.find((s) => s.sortOrder === sIndex);
      if (createdSection) {
        sectionInput.items.forEach((item, iIndex) => {
          itemsToCreate.push({
            quoteId: quoteId,
            sectionId: createdSection.id,
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents ?? null,
            totalCents: item.unitPriceCents === undefined ? null : calculateItemTotalCents(item.quantity, item.unitPriceCents),
            includeInPayroll: item.type === "OTHER" ? Boolean(item.includeInPayroll) : item.type === "LABOR",
            customRatePercent: item.type === "OTHER" && item.includeInPayroll ? (item.customRatePercent ?? 40) : (item.customRatePercent ?? null),
            sortOrder: iIndex,
          });
        });
      }
    });

    if (itemsToCreate.length > 0) {
      await tx.quoteItem.createMany({ data: itemsToCreate });
    }

    return updatedQuote;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateDraftQuoteFromForm(
  quoteId: string,
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  await requireOperationalRole();

  const parsed = quoteDraftFormInputSchema.safeParse(quoteFormDataToInput(formData));

  if (!parsed.success) {
    return { error: quoteFormValidationError(parsed.error.issues) };
  }

  try {
    await updateDraftQuote(quoteId, parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === "This quote is not editable.") {
      return { error: "Esta cotización ya no se puede editar." };
    }

    if (error instanceof Error && error.message.startsWith("Esta cotización ya tiene ")) {
      return { error: error.message };
    }

    return { error: "No se pudo guardar la cotización. Intenta de nuevo." };
  }

  revalidatePath(quotesPath);
  revalidatePath(`${quotesPath}/${quoteId}/edit`);
  redirect(`${quotesPath}?updated=1`);
}

export async function updateDraftQuoteFromWorkspace(
  quoteId: string,
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  const parsed = quoteDraftFormInputSchema.safeParse(quoteFormDataToInput(formData));
  if (!parsed.success) return { error: quoteFormValidationError(parsed.error.issues) };

  try {
    await updateDraftQuote(quoteId, parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === "This quote is not editable.") {
      return { error: "Esta cotización ya no se puede editar." };
    }
    if (error instanceof Error && error.message.startsWith("Esta cotización ya tiene ")) {
      return { error: error.message };
    }
    return { error: "No se pudo guardar la cotización. Intenta de nuevo." };
  }

  revalidatePath(quotesPath);
  return { success: true };
}

const ACTIVE_PAYMENT_REQUEST_STATUSES: PaymentRequestStatus[] = [
  PaymentRequestStatus.PENDING,
  PaymentRequestStatus.VIEWED,
  PaymentRequestStatus.FISCAL_DATA_REQUIRED,
  PaymentRequestStatus.READY_TO_PAY,
];

export async function correctCompletedWorkQuote(quoteId: string, input: unknown) {
  const session = await requireAdmin();
  const actorId = session.profile.id;

  const raw = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const operationKey = typeof raw.operationKey === "string" && raw.operationKey.trim() !== ""
    ? raw.operationKey.trim()
    : randomUUID();
  const reason = typeof raw.reason === "string" && raw.reason.trim() !== ""
    ? raw.reason.trim()
    : "Ajuste de conceptos en nota completada";

  const data = quoteDraftInputSchema.parse(input);
  const requestedOperationalDate = data.operationalDate === undefined
    ? undefined
    : normalizeOperationalDate(data.operationalDate);
  const sectionData = data.sections.map((section, sIndex) => ({
    name: section.name,
    isAuthorized: section.isAuthorized ?? false,
    sortOrder: sIndex,
  }));
  const totals = draftTotals(data);
  if (
    totals.totalCents === null ||
    totals.subtotalCents === null ||
    totals.taxCents === null
  ) {
    throw new Error("Todos los conceptos de una nota completada deben tener precio unitario definido.");
  }
  const newTotalCents = totals.totalCents;
  const newSubtotalCents = totals.subtotalCents;
  const newTaxCents = totals.taxCents;

  return prisma.$transaction(async (tx) => {
    // 1. Check idempotency
    const existingCorrection = await tx.quoteCommercialCorrection.findUnique({
      where: { operationKey },
      include: {
        quote: {
          include: { sections: true },
        },
      },
    });
    if (existingCorrection) {
      return existingCorrection.quote;
    }

    // 2. Pre-read to discover candidate payments to lock
    const preQuote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: {
        workOrder: {
          include: {
            paymentApplications: {
              where: {
                reversedAt: null,
                payment: { status: PaymentStatus.PAID, reversedAt: null },
              },
              select: { paymentId: true },
            },
          },
        },
      },
    });

    if (!preQuote) {
      throw new Error("Quote not found.");
    }

    if (!preQuote.workOrder || preQuote.workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new Error("Only completed work can be corrected.");
    }

    const candidatePaymentIds = Array.from(
      new Set((preQuote.workOrder.paymentApplications ?? []).map((pa) => pa.paymentId)),
    );

    // 3. Acquire locks in canonical order: Payment then Quote
    await lockPaymentMutationScope(tx, {
      paymentIds: candidatePaymentIds,
      quoteIds: [quoteId],
    });

    // 4. Re-read quote and active applications under lock
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
        sections: { include: { items: true } },
        workOrder: true,
        settlementAgreement: true,
      },
    });

    if (!quote || !quote.workOrder || quote.workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new Error("Only completed work can be corrected.");
    }

    if (
      requestedOperationalDate &&
      requestedOperationalDate.getTime() !== quote.operationalDate.getTime()
    ) {
      throw new Error("Only draft quotes can change their operational date.");
    }

    // 5. Re-read effective applications under lock
    const effectiveApplications = await tx.paymentApplication.findMany({
      where: {
        workOrderId: quote.workOrder.id,
        reversedAt: null,
        payment: { status: PaymentStatus.PAID, reversedAt: null },
      },
      include: {
        payment: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    // Enforce: cannot transfer note to another customer if payments exist
    if (effectiveApplications.length > 0 && data.customerId && data.customerId !== quote.customerId) {
      throw new Error("No se puede cambiar el cliente de una nota con pagos aplicados.");
    }

    const currentAppliedCents = effectiveApplications.reduce((sum, app) => sum + app.amountCents, 0);
    const now = new Date();

    // 6. Handle financial reconciliation if newTotalCents < currentAppliedCents
    const correctionApplicationsToCreate: Array<{
      originalApplicationId: string;
      reversalLedgerEntryId: string;
      replacementApplicationId: string | null;
      replacementLedgerEntryId: string | null;
      workOrderId: string;
      originalAmountCents: number;
      reversalAmountCents: number;
      replacementAmountCents: number;
      releasedCreditCents: number;
      sortOrder: number;
    }> = [];

    let excessCreditCents = 0;
    let finalAppliedCents = currentAppliedCents;

    if (newTotalCents < currentAppliedCents) {
      let reductionNeeded = currentAppliedCents - newTotalCents;
      excessCreditCents = reductionNeeded;
      finalAppliedCents = newTotalCents;

      // Iterate in LIFO order (latest applications reversed first)
      const lifoApplications = [...effectiveApplications].reverse();

      for (let i = 0; i < lifoApplications.length && reductionNeeded > 0; i++) {
        const app = lifoApplications[i];

        // Locate original application ledger entry
        const origLedger = await tx.ledgerEntry.findFirst({
          where: {
            movementType: LedgerMovementType.PAYMENT_APPLICATION,
            paymentApplicationId: app.id,
          },
        });

        // Fully reverse original application
        await tx.paymentApplication.update({
          where: { id: app.id },
          data: {
            reversedAt: now,
            reversalReason: reason,
            reversedById: actorId,
          },
        });

        // Insert reversal ledger entry
        const reversalLedger = await tx.ledgerEntry.create({
          data: {
            customerId: app.payment.customerId,
            type: LedgerEntryType.DEBIT,
            movementType: LedgerMovementType.APPLICATION_REVERSAL,
            amountCents: app.amountCents,
            paymentId: app.paymentId,
            paymentApplicationId: app.id,
            workOrderId: app.workOrderId,
            actorId,
            reason,
            reversedMovementId: origLedger?.id ?? null,
          },
        });

        let replacementAppId: string | null = null;
        let replacementLedgerId: string | null = null;
        let replacementAmount = 0;

        if (app.amountCents > reductionNeeded) {
          // Partial reduction: recreate active application for remaining portion
          replacementAmount = app.amountCents - reductionNeeded;
          reductionNeeded = 0;

          const replacementApp = await tx.paymentApplication.create({
            data: {
              operationKey: `${operationKey}:app:${app.id}:replacement`,
              paymentId: app.paymentId,
              workOrderId: app.workOrderId,
              amountCents: replacementAmount,
              actorId,
            },
          });
          replacementAppId = replacementApp.id;

          const replacementLedger = await tx.ledgerEntry.create({
            data: {
              customerId: app.payment.customerId,
              type: LedgerEntryType.CREDIT,
              movementType: LedgerMovementType.PAYMENT_APPLICATION,
              amountCents: replacementAmount,
              paymentId: app.paymentId,
              paymentApplicationId: replacementApp.id,
              workOrderId: app.workOrderId,
              actorId,
              reason: `Reemplazo parcial por corrección de nota (${reason})`,
            },
          });
          replacementLedgerId = replacementLedger.id;
        } else {
          // Full reversal
          reductionNeeded -= app.amountCents;
        }

        correctionApplicationsToCreate.push({
          originalApplicationId: app.id,
          reversalLedgerEntryId: reversalLedger.id,
          replacementApplicationId: replacementAppId,
          replacementLedgerEntryId: replacementLedgerId,
          workOrderId: app.workOrderId,
          originalAmountCents: app.amountCents,
          reversalAmountCents: app.amountCents,
          replacementAmountCents: replacementAmount,
          releasedCreditCents: app.amountCents - replacementAmount,
          sortOrder: i,
        });
      }
    }

    // 7. Invalidate SettlementAgreement and active PaymentRequests if total changed
    const previousTotalCents = quote.totalCents ?? 0;
    if (newTotalCents !== previousTotalCents) {
      if (quote.settlementAgreement && quote.settlementAgreement.status === SettlementAgreementStatus.ACTIVE) {
        await tx.settlementAgreement.update({
          where: { id: quote.settlementAgreement.id },
          data: {
            status: SettlementAgreementStatus.CANCELLED,
            cancelledAt: now,
            cancelledById: actorId,
            cancellationReason: `Cancelado automáticamente por corrección comercial de la nota: ${reason}`,
          },
        });

        const revisionsCount = await tx.settlementAgreementRevision.count({
          where: { settlementAgreementId: quote.settlementAgreement.id },
        });

        await tx.settlementAgreementRevision.create({
          data: {
            settlementAgreementId: quote.settlementAgreement.id,
            revisionNumber: revisionsCount + 1,
            nominalSubtotalCents: newSubtotalCents,
            nominalTaxCents: newTaxCents,
            nominalTotalCents: newTotalCents,
            settlementBaseCents: quote.settlementAgreement.settlementBaseCents,
            settlementTaxCents: quote.settlementAgreement.settlementTaxCents,
            settlementTotalCents: quote.settlementAgreement.settlementTotalCents,
            reason: `Cancelado por corrección comercial de la nota (${reason})`,
            actorId,
          },
        });
      }

      await tx.paymentRequest.updateMany({
        where: {
          quoteId: quote.id,
          status: { in: ACTIVE_PAYMENT_REQUEST_STATUSES },
        },
        data: {
          status: PaymentRequestStatus.CANCELLED,
        },
      });
    }

    // 8. Persist audit record in QuoteCommercialCorrection
    const correctionRecord = await tx.quoteCommercialCorrection.create({
      data: {
        operationKey,
        quoteId: quote.id,
        workOrderId: quote.workOrder.id,
        previousTotalCents,
        newTotalCents,
        previousAppliedCents: currentAppliedCents,
        newAppliedCents: finalAppliedCents,
        excessCreditCents,
        reason,
        actorId,
      },
    });

    if (correctionApplicationsToCreate.length > 0) {
      await tx.quoteCommercialCorrectionApplication.createMany({
        data: correctionApplicationsToCreate.map((item) => ({
          ...item,
          correctionId: correctionRecord.id,
        })),
      });
    }

    // 9. Update Quote snapshot and items
    const hasVehicle = hasVehicleData(data.vehicle);
    const shouldLinkVehicle = Boolean(data.customerId && hasVehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = hasVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    const { customerSnapshot, contactSnapshot } = await resolveQuoteSnapshots(
      tx,
      data.customerId,
      data.customerContactId,
      data.customerFiscalProfileId,
    );

    await tx.quoteSection.deleteMany({ where: { quoteId } });
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    const updatedQuote = await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: data.customerId ?? null,
        vehicleId: vehicle?.id ?? null,
        customerContactId: data.customerContactId ?? null,
        customerFiscalProfileId: data.customerFiscalProfileId ?? null,
        vehicleSnapshot,
        customerSnapshot,
        contactSnapshot,
        title: data.title,
        description: nullableOptional(data.description),
        administrative: data.administrative,
        taxEnabled: data.taxEnabled,
        status: quote.status,
        approvedAt: quote.approvedAt,
        operationalDate: quote.operationalDate,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents ?? data.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        sections: { create: sectionData },
      },
      include: { sections: true },
    });

    const itemsToCreate: Prisma.QuoteItemCreateManyInput[] = [];
    data.sections.forEach((sectionInput, sIndex) => {
      const createdSection = updatedQuote.sections.find((s) => s.sortOrder === sIndex);
      if (createdSection) {
        sectionInput.items.forEach((item, iIndex) => {
          itemsToCreate.push({
            quoteId: quoteId,
            sectionId: createdSection.id,
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents ?? null,
            totalCents: item.unitPriceCents === undefined ? null : calculateItemTotalCents(item.quantity, item.unitPriceCents),
            includeInPayroll: item.type === "OTHER" ? Boolean(item.includeInPayroll) : item.type === "LABOR",
            customRatePercent: item.type === "OTHER" && item.includeInPayroll ? (item.customRatePercent ?? 40) : (item.customRatePercent ?? null),
            sortOrder: iIndex,
          });
        });
      }
    });

    if (itemsToCreate.length > 0) {
      await tx.quoteItem.createMany({ data: itemsToCreate });
    }

    return updatedQuote;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function correctCompletedWorkQuoteFromWorkspace(
  quoteId: string,
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  const parsed = quoteDraftFormInputSchema.safeParse(quoteFormDataToInput(formData));
  if (!parsed.success) return { error: quoteFormValidationError(parsed.error.issues) };

  const operationKey = (formData.get("operationKey") as string | null) || randomUUID();
  const reason = (formData.get("reason") as string | null) || "Ajuste de conceptos en nota completada";

  try {
    await correctCompletedWorkQuote(quoteId, {
      ...parsed.data,
      operationKey,
      reason,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Only completed work can be corrected.") {
      return { error: "Solo se pueden corregir notas de trabajos completados." };
    }
    if (error instanceof Error && error.message === "No se puede cambiar el cliente de una nota con pagos aplicados.") {
      return { error: error.message };
    }
    if (error instanceof Error && error.message.startsWith("Esta cotización ya tiene ")) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : "No se pudo corregir la nota. Intenta de nuevo." };
  }

  revalidatePath(quotesPath);
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");
  return { success: true };
}

export async function cancelQuote(quoteId: string) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId } });

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (quote.isLocked) {
      throw new Error("Este documento está bloqueado.");
    }

    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.SENT) {
      throw new Error("Only draft or sent quotes can be cancelled.");
    }

    const updated = await tx.quote.updateMany({
      where: { id: quoteId, status: quote.status },
      data: { status: QuoteStatus.CANCELLED },
    });

    if (updated.count !== 1) {
      throw new Error("Quote cancellation state changed. Reload and try again.");
    }

    return tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
  });
}

export async function cancelQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid-cancellation`);
  }

  try {
    await cancelQuote(quoteId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("cancelled")) {
      redirect(`${quotesPath}?error=not-draft-sent`);
    }

    redirect(`${quotesPath}?error=cancellation-failed`);
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?cancelled=1`);
}

const archivableQuoteStatuses: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.REJECTED, QuoteStatus.CANCELLED];
const inactivePaymentRequestStatuses = [PaymentRequestStatus.CANCELLED, PaymentRequestStatus.EXPIRED];

export async function archiveQuote(quoteId: string, reason: string) {
  const { profile } = await requireOperationalRole();
  const parsedReason = quoteLifecycleReasonSchema.safeParse(reason);
  if (!parsedReason.success) throw new Error("Archive reason is required.");

  await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { workOrder: true } });
    if (!quote) throw new Error("Quote not found.");
    if (quote.isLocked) throw new Error("Este documento está bloqueado.");
    if (!archivableQuoteStatuses.includes(quote.status) || quote.workOrder) {
      throw new Error("This quote has active operational work and cannot be archived.");
    }
    if (await tx.payment.count({ where: { quoteId } })) {
      throw new Error("This quote has financial activity and cannot be archived.");
    }

    const archived = await tx.quote.updateMany({
      where: { id: quoteId, status: quote.status },
      data: { status: QuoteStatus.ARCHIVED },
    });
    if (archived.count !== 1) throw new Error("Quote archive state changed. Reload and try again.");

    const now = new Date();
    await tx.sharedQuote.updateMany({ where: { quoteId, revokedAt: null }, data: { revokedAt: now } });
    await tx.paymentRequest.updateMany({
      where: { quoteId, status: { notIn: inactivePaymentRequestStatuses } },
      data: { status: PaymentRequestStatus.CANCELLED },
    });
    await tx.quoteLifecycleEvent.create({
      data: { quoteId, previousState: quote.status, nextState: QuoteStatus.ARCHIVED, actorId: profile.id, reason: parsedReason.data },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath(quotesPath);
}

export async function restoreArchivedQuote(quoteId: string, reason: string) {
  const { profile } = await requireOperationalRole();
  const parsedReason = quoteLifecycleReasonSchema.safeParse(reason);
  if (!parsedReason.success) throw new Error("Restore reason is required.");

  await prisma.$transaction(async (tx) => {
    const restored = await tx.quote.updateMany({
      where: { id: quoteId, status: QuoteStatus.ARCHIVED },
      data: { status: QuoteStatus.DRAFT },
    });
    if (restored.count !== 1) throw new Error("Only archived quotes can be restored.");
    await tx.quoteLifecycleEvent.create({
      data: { quoteId, previousState: QuoteStatus.ARCHIVED, nextState: QuoteStatus.DRAFT, actorId: profile.id, reason: parsedReason.data },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath(quotesPath);
}

async function deleteQuoteAuthorized(quoteId: string) {
  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId } });

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (quote.isLocked) {
      throw new Error("Este documento está bloqueado.");
    }

    const deletableStatuses: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.CANCELLED, QuoteStatus.REJECTED, QuoteStatus.ARCHIVED];
    if (!deletableStatuses.includes(quote.status)) {
      throw new Error("This quote cannot be deleted in its current state.");
    }

    if (await tx.payment.count({ where: { quoteId } })) {
      throw new Error("This quote has financial activity and cannot be deleted.");
    }

    if (await tx.workOrder.count({ where: { quoteId } })) {
      throw new Error("This quote has an associated work order and cannot be deleted.");
    }

    await tx.sharedQuote.deleteMany({ where: { quoteId } });
    await tx.quoteDecision.deleteMany({ where: { quoteId } });
    await tx.quoteLifecycleEvent.deleteMany({ where: { quoteId } });
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quoteSection.deleteMany({ where: { quoteId } });
    await tx.paymentRequest.deleteMany({ where: { quoteId } });

    await tx.quote.delete({
      where: { id: quoteId },
    });
    return quote;
  });
}

export async function lockQuoteAction(quoteId: string, reason: string) {
  const { profile } = await requireOperationalRole();
  const parsedReason = quoteLifecycleReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    throw new Error("El motivo de bloqueo es obligatorio.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      select: { id: true, isLocked: true, status: true },
    });

    if (!quote) {
      throw new Error("Documento no encontrado.");
    }

    if (quote.isLocked) {
      throw new Error("El documento ya está bloqueado.");
    }

    const now = new Date();
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        isLocked: true,
        lockedAt: now,
        lockedById: profile.id,
        lockedReason: parsedReason.data,
      },
    });

    await tx.quoteLifecycleEvent.create({
      data: {
        quoteId,
        eventType: "LOCK",
        previousState: quote.status,
        nextState: quote.status,
        actorId: profile.id,
        reason: parsedReason.data,
        createdAt: now,
      },
    });

    return { success: true };
  });

  revalidatePath(quotesPath);
  revalidatePath("/admin/notas");
  revalidatePath("/admin/work-orders");
  return result;
}

export async function unlockQuoteAction(quoteId: string, reason: string) {
  const { profile } = await requireAdmin();
  const parsedReason = quoteLifecycleReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    throw new Error("El motivo de desbloqueo es obligatorio.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      select: { id: true, isLocked: true, status: true },
    });

    if (!quote) {
      throw new Error("Documento no encontrado.");
    }

    if (!quote.isLocked) {
      throw new Error("El documento no está bloqueado.");
    }

    const now = new Date();
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedById: null,
        lockedReason: null,
      },
    });

    await tx.quoteLifecycleEvent.create({
      data: {
        quoteId,
        eventType: "UNLOCK",
        previousState: quote.status,
        nextState: quote.status,
        actorId: profile.id,
        reason: parsedReason.data,
        createdAt: now,
      },
    });

    return { success: true };
  });

  revalidatePath(quotesPath);
  revalidatePath("/admin/notas");
  revalidatePath("/admin/work-orders");
  return result;
}

export async function deleteQuote(quoteId: string) {
  await requireOperationalRole();
  return deleteQuoteAuthorized(quoteId);
}

export async function deleteQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid-deletion`);
  }

  try {
    await deleteQuoteAuthorized(quoteId);
  } catch (error) {
    console.error("[deleteQuoteFromForm] Error deleting quote:", error);
    if (error instanceof Error && error.message.includes("deleted")) {
      redirect(`${quotesPath}?error=cannot-delete`);
    }

    redirect(`${quotesPath}?error=deletion-failed`);
  }

  redirect(`${quotesPath}?deleted=1`);
}

export async function approveQuoteAndCreateWorkOrder(quoteId: string) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { workOrder: true, items: true, sections: { include: { items: true } } },
    });

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (quote.isLocked) {
      throw new Error("Este documento está bloqueado.");
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error("Only draft quotes can be approved.");
    }

    if (quote.workOrder) {
      throw new Error("This quote already has a work order.");
    }

    assertCommercialQuote(quote);

    const approvedAt = new Date();
    const updatedQuote = await tx.quote.updateMany({
      where: { id: quote.id, status: QuoteStatus.DRAFT },
      data: { status: QuoteStatus.APPROVED, approvedAt },
    });

    if (updatedQuote.count !== 1) {
      throw new Error("Quote approval state changed. Reload and try again.");
    }

    const woNumber = await nextWorkOrderNumber(tx);

    return tx.workOrder.create({
      data: {
        quoteId: quote.id,
        number: woNumber,
      },
    });
  });
}

export async function approveQuoteAndCreateWorkOrderFromForm(formData: FormData) {
  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid-approval`);
  }

  try {
    await approveQuoteAndCreateWorkOrder(quoteId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`${quotesPath}?error=duplicate-work-order`);
    }

    redirect(`${quotesPath}?error=approval-failed`);
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?approved=1`);
}

export async function publishSharedQuote(quoteId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  await requireOperationalRole();
  let result: { success: boolean; error?: string };

  try {
    result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { sections: { include: { items: true } } } });
      if (!quote) return { success: false, error: "No se encontró la cotización." };
      assertCommercialQuote(quote);
      const updated = await tx.quote.updateMany({ where: { id: quoteId, status: QuoteStatus.DRAFT }, data: { status: QuoteStatus.SENT } });
      if (updated.count !== 1) return { success: false, error: "La cotización cambió de estado. Recarga e intenta de nuevo." };
      return { success: true };
    });
  } catch (error) {
    if (error instanceof CommercialQuoteValidationError) {
      return { success: false, error: error.message };
    }
    throw error;
  }

  if (!result.success) return result;
  const shared = await getOrCreateSharedQuoteForQuote(quoteId);
  revalidatePath(quotesPath);
  return { success: true, token: shared.token };
}

// --- Public accept / decline (no auth required; token is the authorization) ---

export async function acceptSharedQuoteAction(token: string, authorizedSectionIds?: string[]) {
  try {
    await acceptSharedQuote(token, authorizedSectionIds);
  } catch (error) {
    if (error instanceof SharedQuoteExpiredError) {
      return { success: false, error: "El enlace de esta cotización expiró." };
    }
    if (error instanceof SharedQuoteRevokedError) {
      return { success: false, error: "El enlace de esta cotización fue revocado." };
    }
    if (error instanceof SharedQuoteNotFoundError) {
      return { success: false, error: "El enlace de esta cotización no es válido o ya no existe." };
    }
    if (error instanceof QuoteDecisionError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "No se pudo aceptar la cotización." };
  }

  revalidatePath(`/cotizacion/${token}`);
  return { success: true };
}

export async function declineSharedQuoteAction(token: string) {
  try {
    await declineSharedQuote(token);
  } catch (error) {
    if (error instanceof SharedQuoteExpiredError) {
      return { success: false, error: "El enlace de esta cotización expiró." };
    }
    if (error instanceof SharedQuoteRevokedError) {
      return { success: false, error: "El enlace de esta cotización fue revocado." };
    }
    if (error instanceof SharedQuoteNotFoundError) {
      return { success: false, error: "El enlace de esta cotización no es válido o ya no existe." };
    }
    if (error instanceof QuoteDecisionError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "No se pudo declinar la cotización." };
  }

  revalidatePath(`/cotizacion/${token}`);
  return { success: true };
}

// --- Admin authorization (auth required) ---

export async function authorizeQuoteAction(quoteId: string, note: string, authorizedSectionIds?: string[]) {
  const { profile } = await requireOperationalRole();

  if (typeof note !== "string" || note.trim().length === 0) {
    return { success: false, error: "La nota de autorización es obligatoria." };
  }

  try {
    await measureServerTiming("action", "quote.authorize", () =>
      authorizeQuote(quoteId, note, profile.id, authorizedSectionIds),
    );
  } catch (error) {
    if (error instanceof QuoteDecisionError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "No se pudo autorizar la cotización." };
  }

  const revalidationStartedAt = performance.now();
  revalidatePath(quotesPath);
  recordServerTiming(
    "post-action",
    "quote.authorize.revalidate",
    performance.now() - revalidationStartedAt,
  );
  return { success: true };
}

export async function correctQuoteDecisionAction(quoteId: string, nextStatus: "APPROVED" | "REJECTED" | "DRAFT") {
  const { profile } = await requireOperationalRole();

  try {
    await correctQuoteDecision(quoteId, nextStatus, profile.id);
  } catch (error) {
    if (error instanceof QuoteDecisionError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo corregir la decisión de la cotización." };
  }

  revalidatePath(quotesPath);
  return { success: true };
}

async function duplicateQuoteAuthorized(quoteId: string) {
  const original = await prisma.quote.findUnique({
    where: { id: quoteId },
    relationLoadStrategy: "join",
    include: {
      items: { where: { sectionId: null }, orderBy: { sortOrder: "asc" } },
      sections: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!original) {
    throw new Error("Quote not found.");
  }

  const validUntil = createQuoteValidUntil();
  const operationalDate = normalizeOperationalDate(undefined);

  return withQuoteNumberRetry(() => prisma.$transaction(async (tx) => {
    const duplicatedQuoteId = randomUUID();
    const quoteNumber = await nextQuoteNumber(tx);
    const sectionData = original.sections.map((section, sIndex) => ({
      name: section.name,
      sortOrder: sIndex,
    }));

    const duplicatedQuote = await tx.quote.create({
      data: {
        id: duplicatedQuoteId,
        customerId: original.customerId,
        customerContactId: original.customerContactId,
        customerFiscalProfileId: original.customerFiscalProfileId,
        customerSnapshot: original.customerSnapshot ?? Prisma.JsonNull,
        contactSnapshot: original.contactSnapshot ?? Prisma.JsonNull,
        vehicleId: original.vehicleId,
        vehicleSnapshot: original.vehicleSnapshot ?? Prisma.JsonNull,
        number: quoteNumber,
        status: "DRAFT",
        title: original.title,
        description: original.description,
        administrative: original.administrative,
        taxEnabled: original.taxEnabled,
        subtotalCents: original.subtotalCents,
        discountCents: original.discountCents,
        taxCents: original.taxCents,
        totalCents: original.totalCents,
        operationalDate,
        validUntil,
        items: {
          create: original.items.map((item, itemIndex) => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.totalCents,
            sortOrder: itemIndex,
          })),
        },
        sections: { create: sectionData },
      },
      include: { sections: true },
    });
    const itemsToCreate: Prisma.QuoteItemCreateManyInput[] = [];
    original.sections.forEach((sectionInput, sIndex) => {
      const createdSection = duplicatedQuote.sections.find((s) => s.sortOrder === sIndex);
      if (createdSection) {
        sectionInput.items.forEach((item, iIndex) => {
          itemsToCreate.push({
            quoteId: duplicatedQuote.id,
            sectionId: createdSection.id,
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: item.totalCents,
            includeInPayroll: item.includeInPayroll,
            customRatePercent: item.customRatePercent,
            customPayrollBaseCents: item.customPayrollBaseCents,
            sortOrder: iIndex,
          });
        });
      }
    });

    if (itemsToCreate.length > 0) {
      await tx.quoteItem.createMany({ data: itemsToCreate });
    }

    await ensureSharedQuoteInTransaction(tx, duplicatedQuote.id);

    return duplicatedQuote;
  }));
}

export async function duplicateQuote(quoteId: string) {
  await requireOperationalRole();
  return duplicateQuoteAuthorized(quoteId);
}

export async function duplicateQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid`);
    return;
  }

  try {
    await duplicateQuoteAuthorized(quoteId);
  } catch {
    redirect(`${quotesPath}?error=duplicate-failed`);
    return;
  }

  redirect(`${quotesPath}?duplicated=1`);
}
