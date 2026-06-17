"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { customerInputSchema } from "./schemas";

export async function createCustomer(input: unknown) {
  await requireUser();

  const data = customerInputSchema.parse(input);

  return prisma.customer.create({
    data: {
      ...data,
      email: data.email || null,
    },
  });
}
