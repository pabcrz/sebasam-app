"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";
import { businessPaymentConfig } from "@/config/payment";

export type BankAccountData = {
  id: number;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
  isForInvoicing?: boolean;
};

export interface BankDataCardProps {
  bankAccounts?: BankAccountData[];
  isPrint?: boolean;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback is silent; user can still select and copy manually.
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "Copiado" : "Copiar al portapapeles"}
      className="h-9 px-3 print:hidden"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only">{copied ? "Copiado" : "Copiar"}</span>
      <span aria-hidden="true">{copied ? "Copiado" : "Copiar"}</span>
    </Button>
  );
}

function formatGroupedNumber(value: string) {
  return value.replace(/\s/g, "").match(/.{1,4}/g)?.join(" ") ?? "";
}

export function resolveBankAccounts(bankAccounts?: BankAccountData[]): BankAccountData[] {
  // Only fall back to config when the prop is undefined (legacy / no prop).
  // An explicit empty array means the DB has no bank accounts yet — show empty state.
  if (bankAccounts === undefined) {
    return [
      {
        id: 0,
        accountHolder: businessPaymentConfig.bank.accountHolder,
        bankName: businessPaymentConfig.bank.bankName,
        accountNumber: businessPaymentConfig.bank.accountNumber,
        clabe: businessPaymentConfig.bank.clabe,
      },
    ];
  }

  return bankAccounts;
}

/**
 * Renders each bank account as an independent compact card. Account number
 * and CLABE rows only render when their values are non-empty.
 */
export function BankDataCard({ bankAccounts, isPrint = false }: BankDataCardProps) {
  const accounts = resolveBankAccounts(bankAccounts);

  if (isPrint) {
    return (
      <section
        data-testid="bank-data-print"
        className="px-4 pt-2 print:break-inside-avoid print:page-break-inside-avoid"
      >
        <h2 className="text-[11px] font-bold leading-tight text-gray-900">Datos de pago</h2>
        {accounts.length === 0 ? (
          <p data-testid="bank-data-empty" className="mt-1 text-[12px] text-gray-500">
            No hay cuentas bancarias registradas.
          </p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-x-[40px] gap-y-3">
            {accounts.map((account) => {
              const clabe = account.clabe.trim();
              const accountNumber = account.accountNumber.trim();

              return (
                <div key={account.id} data-testid="bank-account-print" className="min-w-[180px] flex-1 basis-[220px] text-[12px] leading-tight">
                  <p className="text-[10px] text-gray-500">
                    {account.bankName}
                    {account.isForInvoicing ? <span className="text-[var(--color-primary)]"> · facturación</span> : null}
                  </p>
                  {clabe ? (
                    <p>
                      <span>CLABE </span>
                      <span className="font-mono">{formatGroupedNumber(clabe)}</span>
                    </p>
                  ) : null}
                  {accountNumber ? (
                    <p>
                      <span>No. cuenta </span>
                      <span className="font-mono">{formatGroupedNumber(accountNumber)}</span>
                    </p>
                  ) : null}
                  <p className="text-[10px] text-gray-500">{account.accountHolder}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de pago</CardTitle>
        <CardDescription>
          Datos para transferencia directa. Cuenta y CLABE tienen acción de copiar al portapapeles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]" data-testid="bank-data-empty">
            No hay cuentas bancarias registradas.
          </p>
        ) : (
          accounts.map((account) => {
          const purpose = account.isForInvoicing
            ? "Facturación y transferencias"
            : "Solo transferencias";
          return (
            <div
              key={account.id}
              data-testid="bank-account-card"
              className="space-y-4 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-base font-semibold text-[var(--color-text-main)]">{account.bankName}</p>
                <span aria-hidden="true" className="text-sm text-[var(--color-text-muted)]">·</span>
                <p className="text-sm font-semibold text-[var(--color-status-info)]">{purpose}</p>
              </div>

              {account.clabe.trim() ? (
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">CLABE</p>
                    <p className="break-all font-mono text-base font-semibold tracking-wide text-[var(--color-text-main)]">
                      {formatGroupedNumber(account.clabe)}
                    </p>
                  </div>
                  <CopyButton value={account.clabe} />
                </div>
              ) : null}

              {account.accountNumber.trim() ? (
                <div
                  className={
                    `flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                      account.clabe.trim() ? "border-t border-[var(--color-border-light)] pt-4" : ""
                    }`
                  }
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--color-text-muted)]">No. Cuenta</p>
                    <p className="break-all font-mono text-sm text-[var(--color-text-main)]">
                      {formatGroupedNumber(account.accountNumber)}
                    </p>
                  </div>
                  <CopyButton value={account.accountNumber} />
                </div>
              ) : null}

              <p
                className={
                  `text-xs text-[var(--color-text-muted)] ${
                    account.clabe.trim() || account.accountNumber.trim()
                      ? "border-t border-[var(--color-border-light)] pt-4"
                      : ""
                  }`
                }
              >
                Titular: {account.accountHolder}
              </p>
            </div>
          );
        })
        )}
      </CardContent>
    </Card>
  );
}
