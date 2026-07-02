"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { createVehicleSnapshot, type VehicleInput } from "@/features/vehicles/schemas";
import { quoteFormInputSchema, quoteInputSchema, type QuoteVehicleInput } from "./schemas";
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

function quoteFormDataToInput(formData: FormData) {
  const items: QuoteItemFormInput[] = [];

  for (let index = 0; true; index += 1) {
    const type = formData.get(`items.${index}.type`);
    const description = formData.get(`items.${index}.description`);
    const quantity = formData.get(`items.${index}.quantity`);
    const unitPriceCents = formData.get(`items.${index}.unitPrice`);

    if (type === null && description === null && quantity === null && unitPriceCents === null) {
      break;
    }

    const item = { type, description, quantity, unitPriceCents };

    const hasAnyItemValue = [item.description, item.quantity, item.unitPriceCents].some(
      (value) => typeof value === "string" && value.trim() !== "",
    );

    if (hasAnyItemValue) {
      items.push(item);
    }
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
    items,
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
  const items = data.items.map((item, index) => {
    const totalCents = calculateItemTotalCents(item.quantity, item.unitPriceCents);

    return {
      ...item,
      quantity: item.quantity,
      totalCents,
      sortOrder: index,
    };
  });
  const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
  const { taxCents, totalCents } = calculateQuoteTotals(subtotalCents, data.taxEnabled);
  const validUntil = createQuoteValidUntil();

  return prisma.$transaction(async (tx) => {
    const shouldLinkVehicle = hasVehicleData(data.vehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = shouldLinkVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    return tx.quote.create({
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
        taxCents,
        totalCents,
        validUntil,
        items: { create: items },
      },
    });
  });
}

export async function createQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const parsed = quoteFormInputSchema.safeParse(quoteFormDataToInput(formData));

  if (!parsed.success) {
    redirect(`${quotesPath}?error=invalid`);
    return;
  }

  await createQuote(parsed.data);
  revalidatePath(quotesPath);
  redirect(`${quotesPath}?created=1`);
}

export async function updateDraftQuote(quoteId: string, input: unknown) {
  await requireOperationalRole();

  const data = quoteInputSchema.parse(input);
  const items = data.items.map((item, index) => {
    const totalCents = calculateItemTotalCents(item.quantity, item.unitPriceCents);

    return {
      ...item,
      quantity: item.quantity,
      totalCents,
      sortOrder: index,
    };
  });
  const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
  const { taxCents, totalCents } = calculateQuoteTotals(subtotalCents, data.taxEnabled);

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

    const shouldLinkVehicle = hasVehicleData(data.vehicle);
    const vehicle = shouldLinkVehicle
      ? await findOrCreateVehicle(tx, buildVehicleInput(data.customerId, data.vehicle))
      : null;
    const vehicleSnapshot = shouldLinkVehicle
      ? createVehicleSnapshot(buildVehicleInput(data.customerId, data.vehicle))
      : Prisma.JsonNull;

    await tx.quoteItem.deleteMany({ where: { quoteId } });

    return tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: data.customerId,
        vehicleId: vehicle?.id ?? null,
        vehicleSnapshot,
        title: data.title,
        description: nullableOptional(data.description),
        administrative: data.administrative,
        taxEnabled: data.taxEnabled,
        subtotalCents,
        taxCents,
        totalCents,
        items: { create: items },
      },
    });
  });
}

export async function updateDraftQuoteFromForm(quoteId: string, formData: FormData) {
  await requireOperationalRole();

  const parsed = quoteFormInputSchema.safeParse(quoteFormDataToInput(formData));

  if (!parsed.success) {
    redirect(`${quotesPath}/${quoteId}/edit?error=invalid`);
  }

  try {
    await updateDraftQuote(quoteId, parsed.data);
  } catch (error) {
    if (error instanceof Error && error.message === "This quote is not editable.") {
      redirect(`${quotesPath}/${quoteId}/edit?error=not-editable`);
    }

    redirect(`${quotesPath}/${quoteId}/edit?error=update-failed`);
  }

  revalidatePath(quotesPath);
  revalidatePath(`${quotesPath}/${quoteId}/edit`);
  redirect(`${quotesPath}?updated=1`);
}

export async function cancelDraftQuote(quoteId: string) {
  await requireOperationalRole();

  return prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({ where: { id: quoteId } });

    if (!quote) {
      throw new Error("Quote not found.");
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new Error("Only draft quotes can be cancelled.");
    }

    const updated = await tx.quote.updateMany({
      where: { id: quoteId, status: QuoteStatus.DRAFT },
      data: { status: QuoteStatus.CANCELLED },
    });

    if (updated.count !== 1) {
      throw new Error("Quote cancellation state changed. Reload and try again.");
    }

    return tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
  });
}

export async function cancelDraftQuoteFromForm(formData: FormData) {
  await requireOperationalRole();

  const quoteId = formData.get("quoteId");

  if (typeof quoteId !== "string" || quoteId.trim() === "") {
    redirect(`${quotesPath}?error=invalid-cancellation`);
  }

  try {
    await cancelDraftQuote(quoteId);
  } catch (error) {
    if (error instanceof Error && error.message === "Only draft quotes can be cancelled.") {
      redirect(`${quotesPath}?error=not-draft`);
    }

    redirect(`${quotesPath}?error=cancellation-failed`);
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?cancelled=1`);
}

export async function approveQuoteAndCreateWorkOrder(quoteId: string) {
  await requireOperationalRole();

  const woNumber = await nextWorkOrderNumber();

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
    await authorizeQuote(quoteId, note, profile.id);
  } catch (error) {
    if (error instanceof QuoteDecisionError) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "No se pudo autorizar la cotización." };
  }

  revalidatePath(quotesPath);
  return { success: true };
}

export async function duplicateQuote(quoteId: string) {
  await requireOperationalRole();

  const original = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!original) {
    throw new Error("Quote not found.");
  }

  const quoteNumber = await nextQuoteNumber();
  const validUntil = createQuoteValidUntil();

  const items = original.items.map((item, index) => ({
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    totalCents: item.totalCents,
    sortOrder: index,
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

    return tx.quote.create({
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
        taxCents: original.taxCents,
        totalCents: original.totalCents,
        validUntil,
        items: { create: items },
      },
    });
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
  } catch (error) {
    redirect(`${quotesPath}?error=duplicate-failed`);
    return;
  }

  revalidatePath(quotesPath);
  redirect(`${quotesPath}?duplicated=1`);
}
