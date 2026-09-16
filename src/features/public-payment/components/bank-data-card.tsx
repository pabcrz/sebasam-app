"use client";

import * as React from "react";
import { clsx } from "clsx";
import { User, Building2, Hash, CreditCard, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
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
}

type BankField = {
  key: string;
  label: string;
  icon: React.ElementType;
  value: string;
  copyable?: boolean;
};

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
 * Renders a list of bank account rows within a card. Each account shows
 * account holder and bank name unconditionally. Account number and CLABE
 * rows only render when their values are non-empty, each with a copy button.
 */
export function BankDataCard({ bankAccounts }: BankDataCardProps) {
  const accounts = resolveBankAccounts(bankAccounts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de pago</CardTitle>
        <CardDescription>
          Datos para transferencia directa. Cuenta y CLABE tienen acción de copiar al portapapeles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {accounts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]" data-testid="bank-data-empty">
            No hay cuentas bancarias registradas.
          </p>
        ) : (
          accounts.map((account, index) => {
          const isLast = index === accounts.length - 1;
          const fields: BankField[] = [
            { key: `accountHolder-${account.id}`, label: "Titular", icon: User, value: account.accountHolder },
            { key: `bankName-${account.id}`, label: "Banco", icon: Building2, value: account.bankName },
          ];

          if (account.accountNumber.trim()) {
            fields.push({
              key: `accountNumber-${account.id}`,
              label: "No. Cuenta",
              icon: Hash,
              value: account.accountNumber,
              copyable: true,
            });
          }

          if (account.clabe.trim()) {
            fields.push({
              key: `clabe-${account.id}`,
              label: "CLABE",
              icon: CreditCard,
              value: account.clabe,
              copyable: true,
            });
          }

          return (
            <div key={account.id}>
              {accounts.length > 1 || account.isForInvoicing ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  {accounts.length > 1 ? (
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      Cuenta {index + 1}
                    </p>
                  ) : <div />}
                  {account.isForInvoicing ? (
                    <Badge variant="info">Facturación</Badge>
                  ) : null}
                </div>
              ) : null}
              <div className={clsx("space-y-3", !isLast && "pb-6 border-b border-[var(--color-border-light)]")}>
                {fields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div
                      key={field.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--color-text-muted)]">{field.label}</p>
                          <p
                            className={clsx(
                              "truncate text-sm font-semibold text-[var(--color-text-main)]",
                              (field.key.startsWith("accountNumber") || field.key.startsWith("clabe"))
                                ? "font-mono"
                                : "",
                            )}
                          >
                            {field.value}
                          </p>
                        </div>
                      </div>
                      {field.copyable ? <CopyButton value={field.value} /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
        )}
      </CardContent>
    </Card>
  );
}
