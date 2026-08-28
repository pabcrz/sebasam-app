import type { PaymentSettingsData } from "@/features/payment-settings/domain";

export type PublicBusinessIdentity = {
  name?: string;
  fullName?: string;
  logoSrc?: string;
  address?: string;
  mapsUrl?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
};

function optionalText(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

/** Maps the editable singleton into the safe contract consumed by public views. */
export function toPublicBusinessIdentity(settings: PaymentSettingsData): PublicBusinessIdentity {
  return {
    name: optionalText(settings.name),
    fullName: optionalText(settings.fullName),
    logoSrc: "/logo-white-short.png",
    address: optionalText(settings.address),
    mapsUrl: optionalText(settings.mapsUrl),
    contactPhone: optionalText(settings.contactPhone),
    contactWhatsapp: optionalText(settings.contactWhatsapp),
  };
}
