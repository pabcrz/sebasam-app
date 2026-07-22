import { publicInfoDefaults } from "@/config/public-info";
import {
  deserializeHours,
  normalizeStringArray,
  PAYMENT_SETTINGS_ID,
  type WorkshopHours,
} from "@/features/payment-settings/domain";
import { prisma } from "@/lib/prisma";

export type PublicInfoData = {
  name: string;
  fullName: string;
  address: string;
  mapsUrl: string;
  contactPhone: string;
  contactWhatsapp: string;
  hours: WorkshopHours;
  services: string[];
  products: string[];
};

export const PUBLIC_INFO_SLOW_QUERY_THRESHOLD_MS = 500;

const publicInfoSelect = {
  name: true,
  fullName: true,
  address: true,
  mapsUrl: true,
  contactPhone: true,
  contactWhatsapp: true,
  hours: true,
  services: true,
  products: true,
} as const;

export async function getPublicInfoSettings(): Promise<PublicInfoData> {
  const startedAt = performance.now();

  try {
    const settings = await prisma.paymentSettings.findUnique({
      where: { id: PAYMENT_SETTINGS_ID },
      select: publicInfoSelect,
    });
    const elapsedMs = performance.now() - startedAt;

    if (elapsedMs > PUBLIC_INFO_SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[public-info] settings query slow: ${elapsedMs.toFixed(1)}ms`);
    }

    if (!settings) return publicInfoDefaults;

    return {
      ...settings,
      hours: deserializeHours(settings.hours),
      services: normalizeStringArray(settings.services),
      products: normalizeStringArray(settings.products),
    };
  } catch {
    console.error("[public-info] settings query failed; using defaults");
    return publicInfoDefaults;
  }
}
