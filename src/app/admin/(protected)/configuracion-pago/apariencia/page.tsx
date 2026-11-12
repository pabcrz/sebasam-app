import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { SettingsScreen } from "@/features/payment-settings/components/settings-screen";
import { AppearanceSettings } from "@/features/payment-settings/components/appearance-settings";

export const metadata: Metadata = {
  title: "Apariencia",
};

export default async function AppearanceSettingsPage() {
  await requireOperationalRole();

  return (
    <SettingsScreen title="Apariencia">
      <AppearanceSettings />
    </SettingsScreen>
  );
}
