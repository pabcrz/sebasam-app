"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PaymentRequestStatus, PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { measureServerTiming, recordServerTiming } from "@/lib/server-timing";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { createVehicleSnapshot, type VehicleInput } from "@/features/vehicles/schemas";
import { quoteFormInputSchema, quoteInputSchema, quoteLifecycleReasonSchema, type QuoteVehicleInput } from "./schemas";
import {
  calculateItemTotalCents,
  calculateQuoteTotals,
  createQuoteValidUntil,
} from "./lib/calculate";
import { isQuoteEditable } from "./lib/editability";
import { nextQuoteNumber, nextWorkOrderNumber } from "./lib/sequence";
import {
  getOrCreateSharedQuoteForQuote,
  SharedQuoteOperationError,
  QuoteDecisionError,
  acceptSharedQuote,
  declineSharedQuote,
  authorizeQuote,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
  SharedQuoteNotFoundError,
} from "./domain";

const quotesPath = "/admin/quotes";

type QuoteItemFormInput = {
  type: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  quantity: FormDataEntryValue | null;
  unitPriceCents: FormDataEntryValue | null;
};

type QuoteSectionFormInput = {
  name: FormDataEntryValue | null;
  items: QuoteItemFormInput[];
};

function quoteFormDataToInput(formData: FormData) {
  const sections: QuoteSectionFormInput[] = [];

  for (let sIndex = 0; true; sIndex += 1) {
    const sectionName = formData.get(`sections.${sIndex}.name`);
    const items: QuoteItemFormInput[] = [];

    for (let index = 0; true; index += 1) {
      const type = formData.get(`sections.${sIndex}.items.${index}.type`);
      const description = formData.get(`sections.${sIndex}.items.${index}.description`);
      const quantity = formData.get(`sections.${sIndex}.items.${index}.quantity`);
      const unitPriceCents = formData.get(`sections.${sIndex}.items.${index}.unitPrice`);

      if (type === null && description === null && quantity === null && unitPriceCents === null) {
        break;
      }

      const item = { type, description, quantity, unitPriceCents };

      const hasAnyItemValue = [item.description, item.unitPriceCents].some(
        (value) => typeof value === "string" && value.trim() !== "",
      ) || (typeof item.quantity === "string" && item.quantity.trim() !== "1");

      if (hasAnyItemValue) {
        items.push(item);
      }
    }

    if (sectionName === null && items.length === 0) {
      break;
    }

    sections.push({ name: sectionName ?? "General", items });
  }

  return {
    customerId: formData.get("customerId"),
    vehicle: {
      plate: formData.get("plate"),
      brand: formData.get("brand"),
      model: formData.get("model"),
      color: undefined,
      year: formData.get("year"),
    },
    title: formData.get("title"),
    description: formData.get("description"),
    administrative: formData.get("administrative") === "on",
    taxEnabled: formData.get("taxEnabled") === "on",
    discountCents: formData.get("discount") || "0",
    sections,
  };
}

function nullableOptional(value: string | undefined) {
  return value ?? null;
}

function hasVehicleData(vehicle: QuoteVehicleInput): boolean {
  return (
    vehicle.plate !== undefined ||
    vehicle.brand !== undefined ||
    vehicle.model !== undefined ||
    vehicle.color !== undefined ||
    vehicle.year !== undefined
  );
}

function buildVehicleInput(customerId: string, vehicle: QuoteVehicleInput): VehicleInput {
  return {
    customerId,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
    year: vehicle.year,
    notes: undefined,
  };
}

export async function createQuote(input: unknown) {
  await requireOperationalRole();

  const data = quoteInputSchema.parse(input);
  const quoteNumber = await nextQuoteNumber();
  const sectionData = data.sections.map((section, sIndex) => ({
    name: section.name,
    sortOrder: sIndex,
  }));
  const subtotalCents = data.sections.reduce(
    (total, section) => total + section.items.reduce((secTotal, item) => secTotal + calculateItemTotalCents(item.quantity, item.unitPriceCents), 0),
    0
  );
  const { taxCents, totalCents, discountCents } = calculateQuoteTotals(subtotalCents, data.taxEnabled, data.discountCents);
  const validUntil = createQuoteValidUntil();

  return prisma.$transaction(async (tx) => {
    const shouldLinkVehicle = hasVehicleData(data.vehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = shouldLinkVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    const quote = await tx.quote.create({
      data: {
        customerId: data.customerId,
        vehicleId: vehicle?.id ?? null,
        vehicleSnapshot,
        number: quoteNumber,
        status: "DRAFT",
        title: data.title,
        description: nullableOptional(data.description),
        administrative: data.administrative,
        taxEnabled: data.taxEnabled,
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
        validUntil,
        sections: { create: sectionData },
      },
      include: { sections: true },
    });

    const itemsToCreate: Prisma.QuoteItemCreateManyInput[] = [];
    data.sections.forEach((sectionInput, sIndex) => {
      const createdSection = quote.sections.find((s) => s.sortOrder === sIndex);
      if (createdSection) {
        sectionInput.items.forEach((item, iIndex) => {
          itemsToCreate.push({
            quoteId: quote.id,
            sectionId: createdSection.id,
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            totalCents: calculateItemTotalCents(item.quantity, item.unitPriceCents),
            sortOrder: iIndex,
          });
        });
      }
    });

    if (itemsToCreate.length > 0) {
      await tx.quoteItem.createMany({ data: itemsToCreate });
    }

    return quote;
  });
}

export type QuoteFormActionState = { error?: string; success?: boolean };

export async function createQuoteFromWorkspace(
  _previousState: QuoteFormActionState,
  formData: FormData,
): Promise<QuoteFormActionState> {
  const parsed = quoteFormInputSchema.safeParse(quoteFormDataToInput(formData));
  if (!parsed.success) return { error: "Revisa los datos e intenta de nuevo." };

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

  const parsed = quoteFormInputSchema.safeParse(quoteFormDataToInput(formData));

  if (!parsed.success) {
    return { error: "Revisa los datos e intenta de nuevo." };
  }

  try {
    await createQuote(parsed.data);
  } catch {
    return { error: "No se pudo crear la cotización. Intenta de nuevo." };
  }
  revalidatePath(quotesPath);
  redirect(`${quotesPath}?created=1`);
}

export async function updateDraftQuote(quoteId: string, input: unknown) {
  await requireOperationalRole();

  const data = quoteInputSchema.parse(input);
  const sectionData = data.sections.map((section, sIndex) => ({
    name: section.name,
    sortOrder: sIndex,
  }));

  const subtotalCents = data.sections.reduce(
    (total, section) => total + section.items.reduce((secTotal, item) => secTotal + calculateItemTotalCents(item.quantity, item.unitPriceCents), 0),
    0,
  );
  const { taxCents, totalCents, discountCents } = calculateQuoteTotals(subtotalCents, data.taxEnabled, data.discountCents);

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

    const isRevertingFromSent = quote.status === QuoteStatus.SENT;

    const paidTotals = await tx.payment.aggregate({
      where: { quoteId, status: PaymentStatus.PAID },
      _sum: { amountCents: true },
    });
    const paidCents = Number(paidTotals._sum.amountCents ?? 0);

    // This form always replaces quote items and recalculates totals. We must ensure
    // the new total is not less than what has already been paid.
    if (paidCents > totalCents) {
      throw new Error(`Esta cotización ya tiene ${paidCents / 100} abonados, el nuevo total no puede ser menor a esa cantidad.`);
    }

    const shouldLinkVehicle = hasVehicleData(data.vehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = shouldLinkVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    await tx.quoteSection.deleteMany({ where: { quoteId } });
    await tx.quoteItem.deleteMany({ where: { quoteId } });

    const updatedQuote = await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: isRevertingFromSent ? QuoteStatus.DRAFT : undefined,
        customerId: data.customerId,
        vehicleId: vehicle?.id ?? null,
        vehicleSnapshot,
        title: data.title,
        description: nullableOptional(data.description),
        administrative: data.administrative,
        taxEnabled: data.taxEnabled,
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
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
            unitPriceCents: item.unitPriceCents,
            totalCents: calculateItemTotalCents(item.quantity, item.unitPriceCents),
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

  const parsed = quoteFormInputSchema.safeParse(quoteFormDataToInput(formData));

  if (!parsed.success) {
    return { error: "Revisa los datos e intenta de nuevo." };
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
  const parsed = quoteFormInputSchema.safeParse(quoteFormDataToInput(formData));
  if (!parsed.success) return { error: "Revisa los datos e intenta de nuevo." };

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

export async function deleteQuote(quoteId: string) {
  await requireOperationalRole();

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

    await tx.quote.update({
      where: { id: quoteId },
      data: { deletedAt: new Date() },
    });
    return quote;
  });
}

export async function deleteQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid-deletion`);
  }

  try {
    await deleteQuote(quoteId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("deleted")) {
      redirect(`${quotesPath}?error=cannot-delete`);
    }

    redirect(`${quotesPath}?error=deletion-failed`);
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?deleted=1`);
}

export async function approveQuoteAndCreateWorkOrder(quoteId: string) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { workOrder: true },
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

export async function shareQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid-share`);
  }

  try {
    await getOrCreateSharedQuoteForQuote(quoteId);
  } catch (error) {
    if (error instanceof SharedQuoteOperationError) {
      redirect(`${quotesPath}?error=share-failed`);
    }

    redirect(`${quotesPath}?error=share-failed`);
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?shared=1`);
}

// --- Public accept / decline (no auth required; token is the authorization) ---

export async function acceptSharedQuoteAction(token: string) {
  try {
    await acceptSharedQuote(token);
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

export async function authorizeQuoteAction(quoteId: string, note: string) {
  const { profile } = await requireOperationalRole();

  if (typeof note !== "string" || note.trim().length === 0) {
    return { success: false, error: "La nota de autorización es obligatoria." };
  }

  try {
    await measureServerTiming("action", "quote.authorize", () =>
      authorizeQuote(quoteId, note, profile.id),
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

export async function duplicateQuote(quoteId: string) {
  await requireOperationalRole();

  const original = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      vehicle: true,
      sections: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!original) {
    throw new Error("Quote not found.");
  }

  const quoteNumber = await nextQuoteNumber();
  const validUntil = createQuoteValidUntil();

  const sectionData = original.sections.map((section, sIndex) => ({
    name: section.name,
    sortOrder: sIndex,
  }));

  return prisma.$transaction(async (tx) => {
    const shouldLinkVehicle = original.vehicle !== null;
    const vehicleInput = shouldLinkVehicle
      ? {
          customerId: original.customerId,
          plate: original.vehicle!.plate ?? undefined,
          brand: original.vehicle!.brand ?? undefined,
          model: original.vehicle!.model ?? undefined,
          color: original.vehicle!.color ?? undefined,
          year: original.vehicle!.year ?? undefined,
          notes: original.vehicle!.notes ?? undefined,
        }
      : null;
    const vehicle = vehicleInput ? await findOrCreateVehicle(tx, vehicleInput) : null;
    const vehicleSnapshot = vehicleInput ? createVehicleSnapshot(vehicleInput) : Prisma.JsonNull;

    const duplicatedQuote = await tx.quote.create({
      data: {
        customerId: original.customerId,
        vehicleId: vehicle?.id ?? null,
        vehicleSnapshot,
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
        validUntil,
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
            sortOrder: iIndex,
          });
        });
      }
    });

    if (itemsToCreate.length > 0) {
      await tx.quoteItem.createMany({ data: itemsToCreate });
    }

    return duplicatedQuote;
  });
}

export async function duplicateQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid`);
    return;
  }

  try {
    await duplicateQuote(quoteId);
  } catch {
    redirect(`${quotesPath}?error=duplicate-failed`);
    return;
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?duplicated=1`);
}
