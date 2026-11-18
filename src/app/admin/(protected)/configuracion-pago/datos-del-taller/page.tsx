import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { SettingsScreen } from "@/features/payment-settings/components/settings-screen";
import { WorkshopSettingsForm } from "@/features/payment-settings/components/workshop-settings-form";

export const metadata: Metadata = {
  title: "Datos del taller",
};

export default async function WorkshopSettingsPage() {
  await requireOperationalRole();
  const settings = await getPaymentSettings();

  return (
    <SettingsScreen title="Datos del taller">
      <WorkshopSettingsForm settings={settings} />
    </SettingsScreen>
  );
}
