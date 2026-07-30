import { describe, expect, it } from "vitest";
import type { PaymentRequestStatus } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import {
  createPaymentRequestDialogContext,
  filterPaymentRequestDialogBankAccounts,
  selectPaymentRequestDialogBankAccount,
} from "./payment-request-dialog-context";

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

const bankAccounts = [
  {
    accountHolder: "Mercado Pago Wallet",
    bankName: "Mercado Pago",
    accountNumber: "mp-account",
    clabe: "mp-clabe",
    isForInvoicing: true,
  },
  {
    accountHolder: "Servicio Basico a Suspensiones",
    bankName: "Santander",
    accountNumber: "santander-account",
    clabe: "santander-clabe",
    isForInvoicing: true,
  },
  {
    accountHolder: "Servicio Basico a Suspensiones",
    bankName: "BBVA",
    accountNumber: "bbva-account",
    clabe: "bbva-clabe",
    isForInvoicing: false,
  },
];

function createQuote(overrides: Partial<QuoteListItem> = {}): QuoteListItem {
  return {
    id: "quote-1",
    customerId: "customer-1",
    vehicleId: null,
    number: "C-001",
    status: "APPROVED",
    title: "Servicio general",
    description: null,
    vehicleSnapshot: null,
    subtotalCents: 10000,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    validUntil: null,
    approvedAt: null,
    administrative: true,
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    customer: { id: "customer-1", name: "Constructora del Norte", fiscalProfiles: [] },
    vehicle: null,
    items: [],
    workOrder: null,
    sharedQuotes: [],
    activeSharedQuote: null,
    paymentRequests: [],
    ...overrides,
  } as QuoteListItem;
}

describe("payment request dialog bank account context", () => {
  it("uses Santander for factura quotes when Santander and Mercado Pago are configured", () => {
    const context = createPaymentRequestDialogContext(
      createQuote({ taxEnabled: true }),
      bankAccounts,
    );

    expect(context.requiresInvoice).toBe(true);
    expect(context.bankAccount).toMatchObject({
      bankName: "Santander",
      accountNumber: "santander-account",
      clabe: "santander-clabe",
    });
  });

  it("does not expose Mercado Pago to the dialog account choice", () => {
    expect(filterPaymentRequestDialogBankAccounts(bankAccounts).map((account) => account.bankName)).toEqual([
      "Santander",
      "BBVA",
    ]);
    expect(selectPaymentRequestDialogBankAccount(false, bankAccounts)).toMatchObject({
      bankName: "BBVA",
      accountNumber: "bbva-account",
    });
  });

  it("uses the latest payment request invoice context before quote tax defaults", () => {
    const context = createPaymentRequestDialogContext(
      createQuote({
        taxEnabled: false,
        paymentRequests: [{
          id: "payment-request-1",
          requiresInvoice: true,
          status: "READY_TO_PAY" as PaymentRequestStatus,
          customerFiscalProfileId: null,
          fiscalSnapshot: null,
        }],
      }),
      bankAccounts,
    );

    expect(context.requiresInvoice).toBe(true);
    expect(context.bankAccount?.bankName).toBe("Santander");
  });
});
