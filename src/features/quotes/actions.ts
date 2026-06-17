"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { quoteFormInputSchema, quoteInputSchema } from "./schemas";

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
    title: formData.get("title"),
    description: formData.get("description"),
    administrative: formData.get("administrative") === "on",
    items,
  };
}

function nullableOptional(value: string | undefined) {
  return value ?? null;
}

function calculateItemTotalCents(quantity: number, unitPriceCents: number) {
  return Math.round(quantity * unitPriceCents);
}

function createQuoteNumber() {
  return `Q-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

  return prisma.quote.create({
    data: {
      customerId: data.customerId,
      number: createQuoteNumber(),
      status: "DRAFT",
      title: data.title,
      description: nullableOptional(data.description),
      administrative: data.administrative,
      subtotalCents,
      taxCents: 0,
      totalCents: subtotalCents,
      items: { create: items },
    },
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
