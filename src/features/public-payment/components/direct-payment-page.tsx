"use client";

import { Receipt, FileText } from "lucide-react";
import { PublicPaymentShell, PublicPaymentContent, type ShellBusinessSettings } from "./public-payment-shell";
import { BankDataCard, type BankAccountData } from "./bank-data-card";
import { ContactCard, type ContactSettings } from "./contact-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export interface DirectPaymentPageProps {
  business: ShellBusinessSettings;
  bankAccounts: BankAccountData[];
  contact: ContactSettings;
}

export function DirectPaymentPage({ business, bankAccounts, contact }: DirectPaymentPageProps) {
  return (
    <PublicPaymentShell badge="payment" business={business}>
      <PublicPaymentContent>
        <div className="space-y-4 md:space-y-6">
          <BankDataCard bankAccounts={bankAccounts} />
          <ContactCard contact={contact} />
        </div>
        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de pago</CardTitle>
              <CardDescription>
                Condiciones según el tipo de operación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)]">
                  <Receipt className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-main)]">Sin factura</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                    Transfiere el monto acordado usando los datos bancarios de arriba.
                    Envía tu comprobante por WhatsApp para confirmación inmediata.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)]">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-main)]">Con factura</p>
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                    Si requieres factura, comparte tus datos fiscales por WhatsApp
                    antes de realizar la transferencia. Se te enviará un enlace personalizado
                    para capturar tu información fiscal y recibir tu CFDI.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicPaymentContent>
    </PublicPaymentShell>
  );
}
