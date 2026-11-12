import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { SettingsScreen } from "@/features/payment-settings/components/settings-screen";
import { BankAccountsSection } from "@/features/payment-settings/components/bank-accounts-section";

export const metadata: Metadata = {
  title: "Cuentas bancarias",
};

export default async function BankAccountsSettingsPage() {
  await requireOperationalRole();
  const settings = await getPaymentSettings();

  return (
    <SettingsScreen title="Cuentas bancarias">
      <BankAccountsSection bankAccounts={settings.bankAccounts} />
    </SettingsScreen>
  );
}
