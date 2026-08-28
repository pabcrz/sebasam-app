import type { Metadata } from "next";
import { Cog } from "lucide-react";
import { requireOperationalRole } from "@/lib/auth/session";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PaymentSettingsForm } from "@/features/payment-settings/components/payment-settings-form";
import { AdminPageHeader } from "@/components/admin-page-header";

export const metadata: Metadata = {
  title: "Configuración de pago",
};

export default async function PaymentSettingsPage() {
  await requireOperationalRole();
  const settings = await getPaymentSettings();

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <AdminPageHeader
          icon={Cog}
          title="Configuración de pago"
          description="Administra los datos bancarios, de contacto y del negocio visibles en las páginas públicas de pago."
        />
      </div>

      <PaymentSettingsForm settings={settings} />
    </section>
  );
}
