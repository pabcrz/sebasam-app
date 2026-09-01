"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerAccountStatement, getCustomerById } from "./queries";
import {
  customerInputSchema,
  customerSearchSchema,
  customerUpdateSchema,
  normalizeMexicanPhone,
  type CustomerInput,
} from "./schemas";

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

function prepareCustomerUpdate(input: unknown, currentPhone: string | null) {
  const inputRecord = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : null;
  const submittedPhone = inputRecord?.phone;
  const preserveLegacyPhone = typeof submittedPhone === "string"
    && submittedPhone === currentPhone
    && submittedPhone.trim() !== ""
    && normalizeMexicanPhone(submittedPhone) == null;
  const parsed = customerUpdateSchema.safeParse(
    preserveLegacyPhone && inputRecord ? { ...inputRecord, phone: undefined } : input,
  );

  return { parsed, preserveLegacyPhone };
}

function toCustomerUpdateData(
  data: ReturnType<typeof customerUpdateSchema.parse>,
  preserveLegacyPhone: boolean,
) {
  return {
    name: data.name,
    email: nullableOptional(data.email),
    ...(preserveLegacyPhone ? {} : { phone: nullableOptional(data.phone) }),
    address: nullableOptional(data.address),
    status: data.status,
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
    // Correctness requires scanning until phoneCanonical is persisted and indexed.
    const phoneCandidates = await prisma.customer.findMany({
      where: {
        AND: [
          { phone: { not: null } },
          { phone: { not: "" } },
        ],
      },
      orderBy: [{ id: "asc" }],
    });
    const phoneMatch = phoneCandidates.find(
      (customer) => customer.phone != null && normalizeMexicanPhone(customer.phone) === data.phone,
    );

    if (phoneMatch) {
      return { success: true, customer: phoneMatch, reused: true } as const;
    }
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
    return sameName || sameEmail;
  });

  if (existingCustomer) {
    return { success: true, customer: existingCustomer, reused: true } as const;
  }

  const customer = await prisma.customer.create({ data: toCustomerCreateData(data) });
  revalidatePath(customersPath);
  revalidatePath(quotesPath);

  return { success: true, customer, reused: false } as const;
}

export async function searchCustomersForQuote(input: unknown) {
  await requireOperationalRole();

  const { query } = customerSearchSchema.parse(input);
  const search = query || undefined;

  return prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } },
            { vehicles: { some: { plate: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : undefined,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 20,
    select: { id: true, name: true },
  });
}

export async function getCustomerDetail(customerId: string) {
  const customer = await getCustomerById(customerId);

  if (!customer) return null;

  const statement = await getCustomerAccountStatement(customer.id);

  return { customer, statement };
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

  const currentCustomer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { phone: true },
  });
  const { parsed, preserveLegacyPhone } = prepareCustomerUpdate(input, currentCustomer.phone);
  if (!parsed.success) throw parsed.error;

  return prisma.customer.update({
    where: { id: customerId },
    data: toCustomerUpdateData(parsed.data, preserveLegacyPhone),
  });
}

export async function updateCustomerBasicsFromForm(customerId: string, formData: FormData) {
  await requireOperationalRole();

  const currentCustomer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { phone: true },
  });
  const { parsed, preserveLegacyPhone } = prepareCustomerUpdate(
    customerFormDataToUpdateInput(formData),
    currentCustomer.phone,
  );

  if (!parsed.success) {
    redirect(`${customersPath}/${customerId}/edit?error=invalid`);
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: toCustomerUpdateData(parsed.data, preserveLegacyPhone),
  });
  revalidatePath(customersPath);
  revalidatePath(`${customersPath}/${customerId}/edit`);
  redirect(`${customersPath}?updated=1`);
}

async function deleteCustomerAuthorized(customerId: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });

    if (!customer) {
      throw new Error("Customer not found.");
    }

    if (await tx.quote.count({ where: { customerId } })) {
      throw new Error("This customer has quotes and cannot be deleted.");
    }

    if (await tx.payment.count({ where: { customerId } })) {
      throw new Error("This customer has financial activity and cannot be deleted.");
    }

    if (await tx.paymentRequest.count({ where: { customerId } })) {
      throw new Error("This customer has payment requests and cannot be deleted.");
    }

    if (await tx.ledgerEntry.count({ where: { customerId } })) {
      throw new Error("This customer has ledger entries and cannot be deleted.");
    }

    await tx.vehicle.deleteMany({ where: { customerId } });
    await tx.customerFiscalProfile.deleteMany({ where: { customerId } });

    await tx.customer.delete({
      where: { id: customerId },
    });

    return customer;
  });
}

export async function deleteCustomer(customerId: string) {
  await requireOperationalRole();
  return deleteCustomerAuthorized(customerId);
}

export async function deleteCustomerFromForm(formData: FormData) {
  await requireOperationalRole();

  const customerId = formData.get("customerId");

  if (typeof customerId !== "string" || customerId.trim() === "") {
    redirect(`${customersPath}?error=invalid-deletion`);
  }

  try {
    await deleteCustomerAuthorized(customerId);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("cannot be deleted") || error.message.includes("not found"))) {
      redirect(`${customersPath}/${customerId}/edit?error=cannot-delete`);
    }
    redirect(`${customersPath}?error=invalid-deletion`);
  }

  revalidatePath(customersPath);
  revalidatePath(`${customersPath}/${customerId}`);
  revalidatePath(`${customersPath}/${customerId}/edit`);
  redirect(`${customersPath}?deleted=1`);
}

