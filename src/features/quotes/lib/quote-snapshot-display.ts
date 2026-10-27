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
      ? "Operador"
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

  return {
    displayName,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
    legalOrFiscalName,
    operatorName,
    operatorRole,
    operatorPhone,
  };
}

export function resolveOptionalCustomerName(source: CustomerDisplayIdentitySource): string | null {
  const customerSnapshot = (source.customerSnapshot && typeof source.customerSnapshot === "object"
    ? source.customerSnapshot
    : null) as CustomerSnapshotData | null;

  return (
    customerSnapshot?.commercialName?.trim() ||
    source.customer?.commercialName?.trim() ||
    customerSnapshot?.name?.trim() ||
    source.customer?.name?.trim() ||
    null
  );
}

export function formatQuoteContactRole(role?: string | null): string | null {
  if (!role) return null;
  const trimmed = role.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toUpperCase();
  if (["DRIVER", "CHOFER", "OPERADOR"].includes(normalized)) return "Operador";
  if (
    [
      "BILLING",
      "FACTURACIÓN",
      "FACTURACION",
      "CONTACTO DE FACTURACIÓN",
      "CONTACTO DE FACTURACION",
    ].includes(normalized)
  ) {
    return "Contacto de facturación";
  }
  if (["CONTACT", "CONTACTO", "CONTACTO RESPONSABLE"].includes(normalized)) {
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
  const parsedSnapshot = quoteContactSnapshotSchema.safeParse(source.contactSnapshot);
  if (parsedSnapshot.success && parsedSnapshot.data.name.trim()) {
    return {
      contactName: parsedSnapshot.data.name.trim(),
      contactRole: formatQuoteContactRole(parsedSnapshot.data.role),
    };
  }

  const liveName = source.customerContact?.name?.trim();
  if (liveName) {
    return {
      contactName: liveName,
      contactRole: formatQuoteContactRole(source.customerContact?.role),
    };
  }

  return { contactName: null, contactRole: null };
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
  const parsedSnapshot = quoteCustomerSnapshotSchema.safeParse(source.customerSnapshot);
  if (parsedSnapshot.success) {
    const data = parsedSnapshot.data;
    const commercialName = data.commercialName?.trim() || null;
    const name = data.name?.trim() || null;
    const legalName = data.legalName?.trim() || null;

    if (commercialName || name) {
      return { customerName: commercialName || name!, legalName };
    }
  }

  return {
    customerName:
      source.customer?.commercialName?.trim() || source.customer?.name?.trim() || "Sin cliente",
    legalName:
      source.customer?.legalName?.trim() || source.customerFiscalProfile?.businessName?.trim() || null,
  };
}
