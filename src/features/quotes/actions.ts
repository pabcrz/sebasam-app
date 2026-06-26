"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { findOrCreateVehicle } from "@/features/vehicles/actions";
import { createVehicleSnapshot } from "@/features/vehicles/schemas";
import { quoteFormInputSchema, quoteInputSchema } from "./schemas";
import {
  calculateItemTotalCents,
  calculateQuoteTotals,
  createQuoteValidUntil,
} from "./lib/calculate";

const quotesPath = "/admin/quotes";

type QuoteItemFormInput = {
  type: FormDataEntryValue | null;
  description: FormDataEntryValue | null;
  quantity: FormDataEntryValue | null;
  unitPriceCents: FormDataEntryValue | null;
};

function quoteFormDataToInput(formData: FormData) {
  const items: QuoteItemFormInput[] = [];

  for (let index = 0; index < 5; index += 1) {
    const item = {
      type: formData.get(`items.${index}.type`),
      description: formData.get(`items.${index}.description`),
      quantity: formData.get(`items.${index}.quantity`),
      unitPriceCents: formData.get(`items.${index}.unitPrice`),
    };

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
      color: formData.get("color"),
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

function createQuoteNumber() {
  return `Q-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function createWorkOrderNumber() {
  return `WO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createQuote(input: unknown) {
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
  const validUntil = createQuoteValidUntil();

  return prisma.$transaction(async (tx) => {
    const vehicleInput = {
      ...data.vehicle,
      customerId: data.customerId,
    };
    const vehicle = await findOrCreateVehicle(tx, vehicleInput);
    const vehicleSnapshot = createVehicleSnapshot(vehicleInput);

    return tx.quote.create({
      data: {
        customerId: data.customerId,
        vehicleId: vehicle.id,
        vehicleSnapshot,
        number: createQuoteNumber(),
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
  }

  await createQuote(parsed.data);
  revalidatePath(quotesPath);
  redirect(`${quotesPath}?created=1`);
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

    return tx.workOrder.create({
      data: {
        quoteId: quote.id,
        number: createWorkOrderNumber(),
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
