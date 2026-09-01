import type { PaymentSettingsData } from "@/features/payment-settings/domain";
export type PublicBusinessIdentity = { businessName?: string; fullName?: string; phone?: string; whatsapp?: string };
const text = (value: string | null | undefined) => value?.trim() || undefined;
export function toPublicBusinessIdentity(settings: PaymentSettingsData): PublicBusinessIdentity {
  const identity: PublicBusinessIdentity = {};
  const businessName = text(settings.name), fullName = text(settings.fullName), phone = text(settings.contactPhone), whatsapp = text(settings.contactWhatsapp);
  if (businessName) identity.businessName = businessName;
  if (fullName) identity.fullName = fullName;
  if (phone) identity.phone = phone;
  if (whatsapp) identity.whatsapp = whatsapp;
  return identity;
}

export function getPublicMapsUrl(value: string | null | undefined) {
  const mapsUrl = text(value);
  if (!mapsUrl) return undefined;

  try {
    const url = new URL(mapsUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? mapsUrl : undefined;
  } catch {
    return undefined;
  }
}
