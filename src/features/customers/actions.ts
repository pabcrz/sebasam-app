"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { customerInputSchema, customerUpdateSchema, type CustomerInput } from "./schemas";

const customersPath = "/admin/customers";
const quotesPath = "/admin/quotes";

function customerFormDataToInput(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  };
}

function customerFormDataToUpdateInput(formData: FormData) {
  return {
    ...customerFormDataToInput(formData),
    status: formData.get("status"),
  };
}

function nullableOptional(value: string | undefined) {
  return value ?? null;
}

function normalizeComparable(value: string | undefined | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}

function toCustomerCreateData(data: CustomerInput) {
  return {
    name: data.name,
    email: nullableOptional(data.email),
    phone: nullableOptional(data.phone),
    address: nullableOptional(data.address),
    notes: nullableOptional(data.notes),
  };
}

export async function createCustomer(input: unknown) {
  await requireOperationalRole();

  const data = customerInputSchema.parse(input);

  return prisma.customer.create({
    data: toCustomerCreateData(data),
  });
}

export async function createOrReuseCustomerForQuote(input: unknown) {
  await requireOperationalRole();

  const parsed = customerInputSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "invalid" } as const;
  }

  const data = parsed.data;
  const comparableName = normalizeComparable(data.name);
  const comparableNameTokens = comparableName.split(" ").filter(Boolean);
  const comparableWhere: Prisma.CustomerWhereInput[] = [
    {
      AND: comparableNameTokens.map((token) => ({
        name: { contains: token, mode: "insensitive" },
      })),
    },
  ];

  if (data.email) {
    comparableWhere.push({ email: { equals: data.email, mode: "insensitive" } });
  }

  if (data.phone) {
    comparableWhere.push({ phone: data.phone });
  }

  const candidates = await prisma.customer.findMany({
    where: {
      OR: comparableWhere,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 10,
  });

  const existingCustomer = candidates.find((customer) => {
    const sameName = normalizeComparable(customer.name) === comparableName;
    const sameEmail = data.email != null && customer.email?.toLocaleLowerCase() === data.email.toLocaleLowerCase();
    const samePhone = data.phone != null && customer.phone === data.phone;

    return sameName || sameEmail || samePhone;
  });

  if (existingCustomer) {
    return { success: true, customer: existingCustomer, reused: true } as const;
  }

  const customer = await prisma.customer.create({ data: toCustomerCreateData(data) });
  revalidatePath(customersPath);
  revalidatePath(quotesPath);

  return { success: true, customer, reused: false } as const;
}

export async function createCustomerFromForm(formData: FormData) {
  await requireOperationalRole();

  const parsed = customerInputSchema.safeParse(customerFormDataToInput(formData));

  if (!parsed.success) {
    redirect(`${customersPath}?error=invalid`);
  }

  await createCustomer(parsed.data);
  revalidatePath(customersPath);
  redirect(`${customersPath}?created=1`);
}

export async function updateCustomerBasics(customerId: string, input: unknown) {
  await requireOperationalRole();

  const data = customerUpdateSchema.parse(input);

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      name: data.name,
      email: nullableOptional(data.email),
      phone: nullableOptional(data.phone),
      address: nullableOptional(data.address),
      status: data.status,
      notes: nullableOptional(data.notes),
    },
  });
}

export async function updateCustomerBasicsFromForm(customerId: string, formData: FormData) {
  await requireOperationalRole();

  const parsed = customerUpdateSchema.safeParse(customerFormDataToUpdateInput(formData));

  if (!parsed.success) {
    redirect(`${customersPath}/${customerId}/edit?error=invalid`);
  }

  await updateCustomerBasics(customerId, parsed.data);
  revalidatePath(customersPath);
  revalidatePath(`${customersPath}/${customerId}/edit`);
  redirect(`${customersPath}?updated=1`);
}
