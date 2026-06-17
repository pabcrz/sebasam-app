"use server";

import { prisma } from "@/lib/prisma";
import { customerInputSchema } from "./schemas";

export async function createCustomer(input: unknown) {
  const data = customerInputSchema.parse(input);

  return prisma.customer.create({
    data: {
      ...data,
      email: data.email || null,
    },
  });
}
