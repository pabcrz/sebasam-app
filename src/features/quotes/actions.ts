"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { quoteInputSchema } from "./schemas";

export async function createQuote(input: unknown) {
  await requireUser();

  const data = quoteInputSchema.parse(input);
  const items = data.items.map((item, index) => {
    const totalCents = Math.round(item.quantity * item.unitPriceCents);

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
      number: `Q-${Date.now()}`,
      title: data.title,
      description: data.description,
      administrative: data.administrative,
      subtotalCents,
      totalCents: subtotalCents,
      items: { create: items },
    },
  });
}
