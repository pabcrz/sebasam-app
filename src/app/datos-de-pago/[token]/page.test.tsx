import { describe, expect, it, vi } from "vitest";
import { PaymentRequestStatus } from "@prisma/client";

const { getPaymentRequestByToken, getPaymentSettings } = vi.hoisted(() => ({
  getPaymentRequestByToken: vi.fn(),
  getPaymentSettings: vi.fn(),
}));

vi.mock("@/features/payment-requests/domain", () => ({
  getPaymentRequestByToken,
  PaymentRequestExpiredError: class PaymentRequestExpiredError extends Error {},
  PaymentRequestCancelledError: class PaymentRequestCancelledError extends Error {},
}));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));

import DatosDePagoPage from "./page";

const bankAccounts = [
  {
    id: 1,
    accountHolder: "Invoice First",
    bankName: "Invoice Bank",
    accountNumber: "111",
    clabe: "111111111111111111",
    isForInvoicing: true,
    sortOrder: 1,
  },
  {
    id: 2,
    accountHolder: "Payment Only",
    bankName: "Payment Bank",
    accountNumber: "222",
    clabe: "222222222222222222",
    isForInvoicing: false,
    sortOrder: 2,
  },
  {
    id: 3,
    accountHolder: "Invoice Last",
    bankName: "Invoice Bank 2",
    accountNumber: "333",
    clabe: "333333333333333333",
    isForInvoicing: true,
    sortOrder: 3,
  },
];

function mockPageData(
  status: PaymentRequestStatus,
  requiresInvoice: boolean,
  accounts = bankAccounts,
) {
  getPaymentRequestByToken.mockResolvedValue({
    id: "request-1",
    token: "token-123",
    status,
    requiresInvoice,
    customer: { id: "customer-1", name: "Customer" },
    quote: null,
    workOrder: null,
    customerFiscalProfile: null,
  });
  getPaymentSettings.mockResolvedValue({
    name: "SEBASAM",
    fullName: "SEBASAM",
    address: "Address",
    mapsUrl: "https://maps.example.com",
    contactPhone: "5555555555",
    contactWhatsapp: "5555555555",
    hours: { weekdays: "Weekdays", saturday: "Saturday" },
    services: [],
    products: [],
    bankAccounts: accounts,
  });
}

async function loadBankAccountProps() {
  const page = await DatosDePagoPage({ params: Promise.resolve({ token: "token-123" }) });
  return page.props.bankAccounts;
}

describe("DatosDePagoPage bank account boundary", () => {
  it.each([
    { requiresInvoice: false, expectedHolders: ["Payment Only"] },
    { requiresInvoice: true, expectedHolders: ["Invoice First", "Invoice Last"] },
  ])("exposes only accounts matching requiresInvoice=$requiresInvoice", async ({ requiresInvoice, expectedHolders }) => {
    mockPageData(PaymentRequestStatus.READY_TO_PAY, requiresInvoice);

    const accounts = await loadBankAccountProps();

    expect(accounts.map((account: { accountHolder: string }) => account.accountHolder)).toEqual(expectedHolders);
  });

  it.each([
    { requiresInvoice: false, accounts: bankAccounts.filter((account) => account.isForInvoicing) },
    { requiresInvoice: true, accounts: bankAccounts.filter((account) => !account.isForInvoicing) },
  ])("returns an explicit empty list when no accounts match requiresInvoice=$requiresInvoice", async ({ requiresInvoice, accounts }) => {
    mockPageData(
      PaymentRequestStatus.READY_TO_PAY,
      requiresInvoice,
      accounts,
    );

    expect(await loadBankAccountProps()).toEqual([]);
  });

  it("preserves settings order and projects only public bank fields", async () => {
    mockPageData(PaymentRequestStatus.READY_TO_PAY, false);

    expect(await loadBankAccountProps()).toEqual([
      {
        id: 2,
        accountHolder: "Payment Only",
        bankName: "Payment Bank",
        accountNumber: "222",
        clabe: "222222222222222222",
      },
    ]);
  });
});
