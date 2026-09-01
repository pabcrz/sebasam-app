import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPaymentSettings, getPublicBankAccountByToken } from "@/features/payment-settings/domain";
import { DirectPaymentPage } from "@/features/public-payment/components/direct-payment-page";

export const metadata: Metadata = { title: "Cuenta bancaria" };

export default async function PublicBankAccountPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [account, settings] = await Promise.all([
    getPublicBankAccountByToken(token),
    getPaymentSettings(),
  ]);

  if (!account) notFound();

  return (
    <DirectPaymentPage
      business={{
        name: settings.name,
        fullName: settings.fullName,
        address: settings.address,
        mapsUrl: settings.mapsUrl,
      }}
      bankAccounts={[account]}
      contact={{
        phone: settings.contactPhone,
        whatsapp: settings.contactWhatsapp,
      }}
    />
  );
}
