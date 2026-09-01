"use client";

import { PublicPaymentShell, type ShellBusinessSettings } from "./public-payment-shell";
import { BankDataCard, type BankAccountData } from "./bank-data-card";
import { ContactCard, type ContactSettings } from "./contact-card";

export interface DirectPaymentPageProps {
  business: ShellBusinessSettings;
  bankAccounts: BankAccountData[];
  contact: ContactSettings;
}

export function DirectPaymentPage({ business, bankAccounts, contact }: DirectPaymentPageProps) {
  return (
    <PublicPaymentShell badge="payment" business={business}>
      <div className="mx-auto max-w-2xl space-y-4 md:space-y-6">
        <BankDataCard bankAccounts={bankAccounts} />
        <ContactCard contact={contact} />
      </div>
    </PublicPaymentShell>
  );
}
