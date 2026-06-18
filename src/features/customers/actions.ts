"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { customerInputSchema, customerUpdateSchema } from "./schemas";

const customersPath = "/admin/customers";

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

export async function createCustomer(input: unknown) {
  await requireOperationalRole();

  const data = customerInputSchema.parse(input);

  return prisma.customer.create({
    data: {
      name: data.name,
      email: nullableOptional(data.email),
      phone: nullableOptional(data.phone),
      address: nullableOptional(data.address),
      notes: nullableOptional(data.notes),
    },
  });
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
