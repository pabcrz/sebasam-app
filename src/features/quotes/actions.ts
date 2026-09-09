"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PaymentRequestStatus, PaymentStatus, Prisma, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { measureServerTiming, recordServerTiming } from "@/lib/server-timing";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { createVehicleSnapshot, type VehicleInput } from "@/features/vehicles/schemas";
import { quoteDraftFormInputSchema, quoteDraftInputSchema, quoteLifecycleReasonSchema, type QuoteVehicleInput } from "./schemas";
import {
  calculateItemTotalCents,
  calculateQuoteTotals,
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
        vehicleSnapshot,
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

    await tx.quoteSection.deleteMany({ where: { quoteId } });
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    const updatedQuote = await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: data.customerId ?? null,
        vehicleId: vehicle?.id ?? null,
        vehicleSnapshot,
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

const ACTIVE_PAYMENT_BLOCK_MESSAGE = "No se puede corregir una nota con un pago activo. Reversa el pago primero.";

export async function correctCompletedWorkQuote(quoteId: string, input: unknown) {
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
    await lockPaymentMutationScope(tx, { quoteIds: [quoteId] });

    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
        sections: { include: { items: true } },
        workOrder: true,
      },
    });

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (!quote.workOrder || quote.workOrder.status !== WorkOrderStatus.COMPLETED) {
      throw new Error("Only completed work can be corrected.");
    }

    const activeApplications = await tx.paymentApplication.findMany({
      where: {
        workOrderId: quote.workOrder.id,
        reversedAt: null,
        payment: { reversedAt: null },
      },
    });

    if (activeApplications.length > 0) {
      throw new Error(ACTIVE_PAYMENT_BLOCK_MESSAGE);
    }

    if (
      requestedOperationalDate &&
      requestedOperationalDate.getTime() !== quote.operationalDate.getTime()
    ) {
      throw new Error("Only draft quotes can change their operational date.");
    }

    const hasVehicle = hasVehicleData(data.vehicle);
    const shouldLinkVehicle = Boolean(data.customerId && hasVehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = hasVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    await tx.quoteSection.deleteMany({ where: { quoteId } });
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    const updatedQuote = await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: data.customerId ?? null,
        vehicleId: vehicle?.id ?? null,
        vehicleSnapshot,
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

  try {
    await correctCompletedWorkQuote(quoteId, parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === ACTIVE_PAYMENT_BLOCK_MESSAGE) {
      return { error: ACTIVE_PAYMENT_BLOCK_MESSAGE };
    }
    if (error instanceof Error && error.message === "Only completed work can be corrected.") {
      return { error: "Solo se pueden corregir notas de trabajos completados." };
    }
    if (error instanceof Error && error.message.startsWith("Esta cotización ya tiene ")) {
      return { error: error.message };
    }
    return { error: "No se pudo corregir la nota. Intenta de nuevo." };
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
