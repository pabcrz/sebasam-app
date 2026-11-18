import { Prisma } from "@/generated/prisma/client";
export {
  formatQuoteContactRole,
  resolveCustomerDisplayIdentity,
  resolveOptionalCustomerName,
  resolveQuotePreviewContact,
  resolveQuotePreviewCustomer,
} from "./quote-snapshot-display";
export type {
  ContactSnapshotData,
  CustomerDisplayIdentitySource,
  CustomerSnapshotData,
  QuotePreviewContactSource,
  QuotePreviewCustomerSource,
} from "./quote-snapshot-display";

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
