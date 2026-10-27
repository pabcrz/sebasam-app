"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { getCustomerBalanceSummary } from "@/features/payments/domain";
import { getCustomerById } from "./queries";
import {
  customerContactInputSchema,
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
    commercialName: formData.get("commercialName"),
    legalName: formData.get("legalName"),
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

function nullableOptional(value: string | undefined | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeComparable(value: string | undefined | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}

function toCustomerCreateData(data: CustomerInput) {
  return {
    name: data.name,
    commercialName: nullableOptional(data.commercialName),
    legalName: nullableOptional(data.legalName),
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
    commercialName: nullableOptional(data.commercialName),
    legalName: nullableOptional(data.legalName),
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
  const search = query?.trim() || undefined;
  const digitsOnly = query ? query.replace(/\D/g, "") : "";

  const orConditions: Prisma.CustomerWhereInput[] = [];

  if (search) {
    orConditions.push(
      { name: { contains: search, mode: "insensitive" } },
      { commercialName: { contains: search, mode: "insensitive" } },
      { legalName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      {
        vehicles: {
          some: {
            OR: [
              { plate: { contains: search, mode: "insensitive" } },
              { economicNumber: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        fiscalProfiles: {
          some: {
            OR: [
              { businessName: { contains: search, mode: "insensitive" } },
              { taxId: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        contacts: {
          some: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    );

    if (digitsOnly.length >= 3) {
      orConditions.push(
        { phone: { contains: digitsOnly } },
        { contacts: { some: { phone: { contains: digitsOnly } } } },
      );
    }
  }

  return prisma.customer.findMany({
    where: search ? { OR: orConditions } : undefined,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 20,
    select: {
      id: true,
      name: true,
      commercialName: true,
      legalName: true,
      phone: true,
      email: true,
      contacts: {
        where: { isActive: true },
        select: { id: true, name: true, phone: true, role: true, isActive: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
      fiscalProfiles: {
        select: { id: true, businessName: true, taxId: true, isDefault: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });
}

export async function getCustomerDetail(customerId: string) {
  const customer = await getCustomerById(customerId);

  if (!customer) return null;

  const balanceSummary = await getCustomerBalanceSummary(prisma, customer.id);

  return {
    customer,
    balance: {
      pendingBalanceCents: balanceSummary.pendingBalanceCents,
      availableCreditCents: balanceSummary.availableCreditCents,
    },
  };
}

export async function createCustomerFromForm(formData: FormData) {
  await requireOperationalRole();

  const parsed = customerInputSchema.safeParse(customerFormDataToInput(formData));

  if (!parsed.success) {
    redirect(`${customersPath}?error=invalid`);
  }

  const initialContactName = formData.get("initialContactName");
  const initialContactPhone = formData.get("initialContactPhone");

  const customer = await createCustomer(parsed.data);

  if (
    typeof initialContactName === "string" &&
    initialContactName.trim() !== ""
  ) {
    try {
      const contactPhone =
        typeof initialContactPhone === "string" && initialContactPhone.trim() !== ""
          ? normalizeMexicanPhone(initialContactPhone) ?? null
          : null;

      await prisma.customerContact.create({
        data: {
          customerId: customer.id,
          name: initialContactName.trim(),
          phone: contactPhone,
          role: "DRIVER",
          isActive: true,
        },
      });
    } catch {
      // Non-blocking fallback if initial contact creation fails
    }
  }

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
    redirect(`${customersPath}/${customerId}?error=invalid`);
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: toCustomerUpdateData(parsed.data, preserveLegacyPhone),
  });
  revalidatePath(customersPath);
  revalidatePath(`${customersPath}/${customerId}`);
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
    await tx.customerContact?.deleteMany({ where: { customerId } });

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
      redirect(`${customersPath}/${customerId}?error=cannot-delete`);
    }
    redirect(`${customersPath}?error=invalid-deletion`);
  }

  revalidatePath(customersPath);
  revalidatePath(`${customersPath}/${customerId}`);
  redirect(`${customersPath}?deleted=1`);
}

export async function deleteCustomerAction(customerId: string) {
  try {
    await requireOperationalRole();
    await deleteCustomerAuthorized(customerId);
    revalidatePath(customersPath);
    return { success: true } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar cliente",
    } as const;
  }
}

export async function deleteCustomersBatchAction(customerIds: string[]) {
  try {
    await requireOperationalRole();
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return { success: false, deletedCount: 0, error: "No customers selected." } as const;
    }

    const deletedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const customerId of customerIds) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) continue;

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
        await tx.customerContact?.deleteMany({ where: { customerId } });
        await tx.customer.delete({ where: { id: customerId } });
        count++;
      }
      return count;
    });

    revalidatePath(customersPath);
    return { success: true, deletedCount } as const;
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Error al eliminar clientes",
    } as const;
  }
}

export async function updateCustomerAction(input: unknown) {
  try {
    await requireOperationalRole();
    if (!input || typeof input !== "object") {
      return { success: false, error: "invalid" } as const;
    }
    const { id, ...data } = input as { id?: string; [key: string]: unknown };
    if (!id || typeof id !== "string") {
      return { success: false, error: "invalid" } as const;
    }

    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { phone: true },
    });
    if (!currentCustomer) {
      return { success: false, error: "not-found" } as const;
    }

    const { parsed, preserveLegacyPhone } = prepareCustomerUpdate(data, currentCustomer.phone);
    if (!parsed.success) {
      return { success: false, error: "invalid" } as const;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: toCustomerUpdateData(parsed.data, preserveLegacyPhone),
    });

    revalidatePath(customersPath);
    return { success: true, customer } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar cliente",
    } as const;
  }
}

export async function createCustomerContactAction(customerId: string, input: unknown) {
  try {
    await requireOperationalRole();
    const data = customerContactInputSchema.parse(input);

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        name: data.name,
        phone: data.phone ?? null,
        role: data.role,
        isActive: data.isActive,
      },
    });

    revalidatePath(`${customersPath}/${customerId}`);
    revalidatePath(quotesPath);
    return { success: true, contact } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear el contacto",
    } as const;
  }
}

export async function updateCustomerContactAction(contactId: string, input: unknown) {
  try {
    await requireOperationalRole();
    const data = customerContactInputSchema.parse(input);

    const contact = await prisma.customerContact.update({
      where: { id: contactId },
      data: {
        name: data.name,
        phone: data.phone ?? null,
        role: data.role,
        isActive: data.isActive,
      },
    });

    revalidatePath(`${customersPath}/${contact.customerId}`);
    revalidatePath(quotesPath);
    return { success: true, contact } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar el contacto",
    } as const;
  }
}

export async function toggleCustomerContactActiveAction(contactId: string, isActive: boolean) {
  try {
    await requireOperationalRole();
    const contact = await prisma.customerContact.update({
      where: { id: contactId },
      data: { isActive },
    });

    revalidatePath(`${customersPath}/${contact.customerId}`);
    revalidatePath(quotesPath);
    return { success: true, contact } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cambiar estado del contacto",
    } as const;
  }
}

export async function deleteCustomerContactAction(contactId: string) {
  try {
    await requireOperationalRole();
    const contact = await prisma.customerContact.delete({
      where: { id: contactId },
    });

    revalidatePath(`${customersPath}/${contact.customerId}`);
    revalidatePath(quotesPath);
    return { success: true } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el contacto",
    } as const;
  }
}


