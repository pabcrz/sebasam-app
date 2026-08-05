import type { listQuotes } from "@/features/quotes/queries";
import type {
  PaymentRequestDialogBankAccount,
  PaymentRequestDialogContext,
} from "@/features/payment-requests/components/payment-request-link-dialog";
import { formatSnapshotVehicle, formatVehicle } from "./format";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];
type PaymentRequestDialogBankAccountCandidate = PaymentRequestDialogBankAccount & {
  isForInvoicing?: boolean | null;
};

function normalizeBankText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function hasBankText(account: PaymentRequestDialogBankAccountCandidate, text: string): boolean {
  return [account.bankName, account.accountHolder]
    .map(normalizeBankText)
    .some((value) => value.includes(text));
}

function isMercadoPagoAccount(account: PaymentRequestDialogBankAccountCandidate): boolean {
  return hasBankText(account, "mercado pago") || hasBankText(account, "mercadopago");
}

function isSantanderAccount(account: PaymentRequestDialogBankAccountCandidate): boolean {
  return hasBankText(account, "santander");
}

export function filterPaymentRequestDialogBankAccounts(
  bankAccounts: PaymentRequestDialogBankAccountCandidate[],
): PaymentRequestDialogBankAccountCandidate[] {
  return bankAccounts.filter((account) => !isMercadoPagoAccount(account));
}

export function selectPaymentRequestDialogBankAccount(
  requiresInvoice: boolean,
  bankAccounts: PaymentRequestDialogBankAccountCandidate[],
): PaymentRequestDialogBankAccount | null {
  const eligibleAccounts = filterPaymentRequestDialogBankAccounts(bankAccounts);
  const selected = requiresInvoice
    ? eligibleAccounts.find((account) => account.isForInvoicing && isSantanderAccount(account)) ??
      eligibleAccounts.find(isSantanderAccount) ??
      eligibleAccounts.find((account) => account.isForInvoicing) ??
      eligibleAccounts[0]
    : eligibleAccounts.find((account) => !account.isForInvoicing) ?? eligibleAccounts[0];

  if (!selected) return null;

  return {
    accountHolder: selected.accountHolder,
    bankName: selected.bankName,
    accountNumber: selected.accountNumber,
    clabe: selected.clabe,
  };
}

export function createPaymentRequestDialogContext(
  quote: QuoteListItem,
  bankAccounts: PaymentRequestDialogBankAccountCandidate[],
): PaymentRequestDialogContext {
  const latestRequest = quote.paymentRequests[0] ?? null;
  const fiscalProfile = quote.customer.fiscalProfiles[0] ?? null;
  const requiresInvoice = latestRequest?.requiresInvoice ?? quote.taxEnabled;
  const bankAccount = selectPaymentRequestDialogBankAccount(requiresInvoice, bankAccounts);

  return {
    quoteNumber: quote.number,
    title: quote.title,
    customerName: quote.customer.name,
    vehicleDescription: quote.vehicle
      ? formatVehicle(quote.vehicle)
      : formatSnapshotVehicle(quote.vehicleSnapshot),
    workOrderNumber: quote.workOrder?.number ?? null,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    requiresInvoice,
    paymentRequestStatus: latestRequest?.status ?? null,
    fiscalProfile: fiscalProfile
      ? {
          businessName: fiscalProfile.businessName,
          taxId: fiscalProfile.taxId,
        }
      : null,
    fiscalActionHref: requiresInvoice ? `/admin/customers/${quote.customer.id}/edit` : null,
    bankAccount,
  };
}
