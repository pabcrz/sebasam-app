import { Metadata } from "next";
import {
  getPaymentRequestByToken,
  PaymentRequestExpiredError,
  PaymentRequestCancelledError,
} from "@/features/payment-requests/domain";
import { PublicPaymentPage } from "@/features/public-payment/components/public-payment-page";
import { PaymentRequestErrorState } from "@/features/public-payment/components/payment-request-error-state";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { type PaymentRequest } from "@prisma/client";
import { toPublicBusinessIdentity } from "@/features/public-branding/domain";

export const metadata: Metadata = {
  title: "Datos de pago",
};

interface PaymentPageProps {
  params: Promise<{ token: string }>;
}

type PublicPaymentRequest = PaymentRequest & {
  customer: { id: string; name: string };
  quote: {
    id: string;
    number: string;
    subtotalCents: number | null;
    taxCents: number | null;
    totalCents: number | null;
    taxEnabled: boolean;
    validUntil: Date | null;
  } | null;
  workOrder: { id: string; number: string } | null;
  customerFiscalProfile: { id: string; businessName: string; taxId: string } | null;
};

type PaymentErrorType = "not-found" | "expired" | "cancelled";

type PaymentPageResult =
  | { kind: "success"; request: PublicPaymentRequest }
  | { kind: "error"; errorType: PaymentErrorType };

type SettingsBankAccount = Awaited<ReturnType<typeof getPaymentSettings>>["bankAccounts"][number];

function toPublicBankAccounts(accounts: SettingsBankAccount[], requiresInvoice: boolean) {
  return accounts
    .filter((account) => account.isForInvoicing === requiresInvoice)
    .map(({ id, accountHolder, bankName, accountNumber, clabe }) => ({
      id,
      accountHolder,
      bankName,
      accountNumber,
      clabe,
    }));
}

function mapErrorToType(error: unknown): PaymentErrorType {
  if (error instanceof PaymentRequestExpiredError) {
    return "expired";
  }

  if (error instanceof PaymentRequestCancelledError) {
    return "cancelled";
  }

  return "not-found";
}

async function loadPaymentPageResult(token: string): Promise<PaymentPageResult> {
  try {
    const request = await getPaymentRequestByToken(token);
    return { kind: "success", request };
  } catch (error) {
    return { kind: "error", errorType: mapErrorToType(error) };
  }
}

export default async function DatosDePagoPage({ params }: PaymentPageProps) {
  const { token } = await params;
  const [result, settings] = await Promise.all([
    loadPaymentPageResult(token),
    getPaymentSettings(),
  ]);

  if (result.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <PaymentRequestErrorState type={result.errorType} />
      </div>
    );
  }

  return (
    <PublicPaymentPage
      request={result.request}
      business={toPublicBusinessIdentity(settings)}
      location={{ address: settings.address, mapsUrl: settings.mapsUrl }}
      bankAccounts={toPublicBankAccounts(settings.bankAccounts, result.request.requiresInvoice)}
      contact={{ phone: settings.contactPhone, whatsapp: settings.contactWhatsapp }}
    />
  );
}
