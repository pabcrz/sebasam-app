import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PaymentSettingsForm } from "@/features/payment-settings/components/payment-settings-form";

export const metadata: Metadata = {
  title: "Configuración de pago",
};

export default async function PaymentSettingsPage() {
  await requireOperationalRole();
  const settings = await getPaymentSettings();

  return (
    <section
      data-testid="payment-settings-page-frame"
      data-layout-width="admin"
      className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10"
    >
      <PaymentSettingsForm settings={settings} />
    </section>
  );
}
