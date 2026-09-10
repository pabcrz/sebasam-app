import { Prisma } from "@prisma/client";

export type CustomerSnapshotData = {
  customerId: string;
  name: string;
  commercialName: string | null;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  fiscalBusinessName?: string | null;
};

export type ContactSnapshotData = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
};

export async function resolveQuoteSnapshots(
  tx: Prisma.TransactionClient,
  customerId?: string | null,
  customerContactId?: string | null,
  customerFiscalProfileId?: string | null,
): Promise<{
  customerSnapshot: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  contactSnapshot: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
}> {
  let customerSnapshot: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = Prisma.JsonNull;
  if (customerId && tx.customer?.findUnique) {
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
      include: {
        fiscalProfiles: customerFiscalProfileId
          ? { where: { id: customerFiscalProfileId } }
          : { where: { isDefault: true } },
      },
    });

    if (customer) {
      const fiscalProfile = customer.fiscalProfiles[0] ?? null;
      customerSnapshot = {
        customerId: customer.id,
        name: customer.name,
        commercialName: customer.commercialName ?? customer.name,
        legalName: fiscalProfile?.businessName ?? customer.legalName ?? null,
        taxId: fiscalProfile?.taxId ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
        address: customer.address ?? null,
      };
    }
  }

  let contactSnapshot: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = Prisma.JsonNull;
  if (customerContactId && tx.customerContact?.findUnique) {
    const contact = await tx.customerContact.findUnique({
      where: { id: customerContactId },
    });
    if (contact) {
      contactSnapshot = {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        role: contact.role,
      };
    }
  }

  return { customerSnapshot, contactSnapshot };
}

export type CustomerDisplayIdentitySource = {
  customer?: {
    name?: string | null;
    commercialName?: string | null;
    legalName?: string | null;
  } | null;
  customerContact?: {
    name?: string | null;
    phone?: string | null;
    role?: string | null;
  } | null;
  customerFiscalProfile?: {
    businessName?: string | null;
  } | null;
  customerSnapshot?: unknown;
  contactSnapshot?: unknown;
};

export function resolveCustomerDisplayIdentity(source: CustomerDisplayIdentitySource) {
  const customerSnapshot = (source.customerSnapshot && typeof source.customerSnapshot === "object"
    ? source.customerSnapshot
    : null) as CustomerSnapshotData | null;

  const contactSnapshot = (source.contactSnapshot && typeof source.contactSnapshot === "object"
    ? source.contactSnapshot
    : null) as ContactSnapshotData | null;

  const displayName =
    customerSnapshot?.commercialName ||
    source.customer?.commercialName ||
    customerSnapshot?.name ||
    source.customer?.name ||
    "Sin cliente";

  const legalOrFiscalName =
    customerSnapshot?.fiscalBusinessName ||
    customerSnapshot?.legalName ||
    source.customerFiscalProfile?.businessName ||
    source.customer?.legalName ||
    null;

  const operatorName = contactSnapshot?.name || source.customerContact?.name || null;
  const rawRole = contactSnapshot?.role || source.customerContact?.role;
  const operatorRole =
    rawRole === "DRIVER"
      ? "Chofer"
      : rawRole === "BILLING"
        ? "Facturación"
        : rawRole === "CONTACT"
          ? "Contacto"
          : "Operador";
  const operatorPhone = contactSnapshot?.phone || source.customerContact?.phone || null;

  const subtitleParts = [
    legalOrFiscalName ? `Razón social: ${legalOrFiscalName}` : null,
    operatorName ? `${operatorRole}: ${operatorName}` : null,
  ].filter(Boolean);

  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined;

  return {
    displayName,
    subtitle,
    legalOrFiscalName,
    operatorName,
    operatorRole,
    operatorPhone,
  };
}
