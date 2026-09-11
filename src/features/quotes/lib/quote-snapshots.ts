import { Prisma } from "@prisma/client";
import { quoteContactSnapshotSchema, quoteCustomerSnapshotSchema } from "@/features/quotes/schemas";

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

export function formatQuoteContactRole(role?: string | null): string | null {
  if (!role) return null;
  const trimmed = role.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toUpperCase();
  if (normalized === "DRIVER" || normalized === "CHOFER") {
    return "Chofer";
  }
  if (
    normalized === "BILLING" ||
    normalized === "FACTURACIÓN" ||
    normalized === "FACTURACION" ||
    normalized === "CONTACTO DE FACTURACIÓN" ||
    normalized === "CONTACTO DE FACTURACION"
  ) {
    return "Contacto de facturación";
  }
  if (
    normalized === "CONTACT" ||
    normalized === "CONTACTO" ||
    normalized === "CONTACTO RESPONSABLE"
  ) {
    return "Contacto responsable";
  }
  return trimmed;
}

export type QuotePreviewContactSource = {
  contactSnapshot?: unknown;
  customerContact?: {
    name?: string | null;
    role?: string | null;
    phone?: string | null;
  } | null;
};

export function resolveQuotePreviewContact(source: QuotePreviewContactSource): {
  contactName: string | null;
  contactRole: string | null;
} {
  // 1. Snapshot takes precedence when valid
  const parsedSnapshot = quoteContactSnapshotSchema.safeParse(source.contactSnapshot);
  if (parsedSnapshot.success && parsedSnapshot.data.name.trim()) {
    return {
      contactName: parsedSnapshot.data.name.trim(),
      contactRole: formatQuoteContactRole(parsedSnapshot.data.role),
    };
  }

  // 2. Fallback to live customerContact
  const liveName = source.customerContact?.name?.trim();
  if (liveName) {
    return {
      contactName: liveName,
      contactRole: formatQuoteContactRole(source.customerContact?.role),
    };
  }

  // 3. Neither is available / selected
  return {
    contactName: null,
    contactRole: null,
  };
}

export type QuotePreviewCustomerSource = {
  customerSnapshot?: unknown;
  customer?: {
    name?: string | null;
    commercialName?: string | null;
    legalName?: string | null;
  } | null;
  customerFiscalProfile?: {
    businessName?: string | null;
  } | null;
};

export function resolveQuotePreviewCustomer(source: QuotePreviewCustomerSource): {
  customerName: string;
  legalName: string | null;
} {
  // 1. Valid snapshot takes precedence
  const parsedSnapshot = quoteCustomerSnapshotSchema.safeParse(source.customerSnapshot);
  if (parsedSnapshot.success) {
    const data = parsedSnapshot.data;
    const commercialName = data.commercialName?.trim() || null;
    const name = data.name?.trim() || null;
    const legalName = data.legalName?.trim() || null;

    if (commercialName || name) {
      return {
        customerName: commercialName || name!,
        legalName,
      };
    }
  }

  // 2. Fallback to live customer record
  const liveCommercial = source.customer?.commercialName?.trim() || null;
  const liveName = source.customer?.name?.trim() || null;
  const liveLegal =
    source.customer?.legalName?.trim() ||
    source.customerFiscalProfile?.businessName?.trim() ||
    null;

  return {
    customerName: liveCommercial || liveName || "Sin cliente",
    legalName: liveLegal,
  };
}
