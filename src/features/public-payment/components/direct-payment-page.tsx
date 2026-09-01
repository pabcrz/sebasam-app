"use client";

import { PublicPaymentShell, type ShellBusinessSettings } from "./public-payment-shell";
import { BankDataCard, type BankAccountData } from "./bank-data-card";
import { WhatsAppReceiptCta } from "./whatsapp-receipt-cta";
import type { ContactSettings } from "./contact-card";

export interface DirectPaymentPageProps {
  business: ShellBusinessSettings;
  location?: { address?: string; mapsUrl?: string };
  bankAccounts: BankAccountData[];
  contact: ContactSettings;
}

export function DirectPaymentPage({ business, location, bankAccounts, contact }: DirectPaymentPageProps) {
  return (
    <PublicPaymentShell badge="payment" business={business} location={location}>
      <div className="mx-auto max-w-2xl space-y-4 md:space-y-6">
        <BankDataCard bankAccounts={bankAccounts} />
        <WhatsAppReceiptCta whatsapp={contact.whatsapp} />
      </div>
    </PublicPaymentShell>
  );
}
