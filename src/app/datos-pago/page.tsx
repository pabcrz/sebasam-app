import { Metadata } from "next";
import { connection } from "next/server";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { toPublicBusinessIdentity } from "@/features/public-branding/domain";
import { DirectPaymentPage } from "@/features/public-payment/components/direct-payment-page";

export const metadata: Metadata = {
  title: "Datos de pago directo",
};

export default async function DatosPagoPage() {
  await connection();
  const settings = await getPaymentSettings();

  return (
    <DirectPaymentPage
       business={toPublicBusinessIdentity(settings)}
      bankAccounts={settings.bankAccounts}
      contact={{
        phone: settings.contactPhone,
        whatsapp: settings.contactWhatsapp,
      }}
    />
  );
}
