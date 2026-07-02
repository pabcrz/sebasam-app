import type { Metadata } from "next";
import { Cog } from "lucide-react";
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
    <section className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 flex items-center gap-3 md:mb-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white">
          <Cog className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)] md:text-3xl">
            Configuración de pago
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Administra los datos bancarios, de contacto y del negocio visibles en las páginas públicas de pago.
          </p>
        </div>
      </div>

      <PaymentSettingsForm settings={settings} />
    </section>
  );
}
