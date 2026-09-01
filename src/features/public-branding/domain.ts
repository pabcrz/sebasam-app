import type { PaymentSettingsData } from "@/features/payment-settings/domain";
export type PublicBusinessIdentity = { businessName?: string; phone?: string; whatsapp?: string };
const text = (value: string | null | undefined) => value?.trim() || undefined;
export function toPublicBusinessIdentity(settings: PaymentSettingsData): PublicBusinessIdentity {
  const identity: PublicBusinessIdentity = {};
  const businessName = text(settings.name), phone = text(settings.contactPhone), whatsapp = text(settings.contactWhatsapp);
  if (businessName) identity.businessName = businessName;
  if (phone) identity.phone = phone;
  if (whatsapp) identity.whatsapp = whatsapp;
  return identity;
}
