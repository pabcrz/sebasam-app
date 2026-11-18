import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { SettingsScreen } from "@/features/payment-settings/components/settings-screen";
import { ContactSettingsForm } from "@/features/payment-settings/components/contact-settings-form";

export const metadata: Metadata = {
  title: "Contacto",
};

export default async function ContactSettingsPage() {
  await requireOperationalRole();
  const settings = await getPaymentSettings();

  return (
    <SettingsScreen title="Contacto">
      <ContactSettingsForm settings={settings} />
    </SettingsScreen>
  );
}
