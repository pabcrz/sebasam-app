import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPaymentSettings, getPublicBankAccountByToken, getPublicBankNameByToken } from "@/features/payment-settings/domain";
import { DirectPaymentPage } from "@/features/public-payment/components/direct-payment-page";

const description = "Consulta los datos de cuenta bancaria para realizar tu pago a SEBASAM.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const bankName = (await getPublicBankNameByToken(token))?.trim();
  const title = bankName
    ? `Datos de cuenta bancaria ${bankName} | SEBASAM`
    : "Datos de cuenta bancaria | SEBASAM";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

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
        businessName: settings.name,
        fullName: settings.fullName,
      }}
      location={{
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
