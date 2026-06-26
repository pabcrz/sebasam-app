"use client";

import * as React from "react";
import { clsx } from "clsx";
import { User, Building2, Hash, CreditCard, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";
import { businessPaymentConfig, type BusinessPaymentConfig } from "@/config/payment";

type BankField = {
  key: keyof BusinessPaymentConfig["bank"];
  label: string;
  icon: React.ElementType;
  value: string;
  copyable?: boolean;
};

const bankFields: BankField[] = [
  { key: "accountHolder", label: "Titular", icon: User, value: businessPaymentConfig.bank.accountHolder },
  { key: "bankName", label: "Banco", icon: Building2, value: businessPaymentConfig.bank.bankName },
  { key: "accountNumber", label: "No. Cuenta", icon: Hash, value: businessPaymentConfig.bank.accountNumber, copyable: true },
  { key: "clabe", label: "CLABE", icon: CreditCard, value: businessPaymentConfig.bank.clabe, copyable: true },
];

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
      className="h-9 px-3"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only">{copied ? "Copiado" : "Copiar"}</span>
      <span aria-hidden="true">{copied ? "Copiado" : "Copiar"}</span>
    </Button>
  );
}

export function BankDataCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de pago</CardTitle>
        <CardDescription>
          Datos para transferencia directa. Cuenta y CLABE tienen acción de copiar al portapapeles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bankFields.map((field) => {
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
                  <p className={clsx("truncate text-sm font-semibold text-[var(--color-text-main)]", field.key === "accountNumber" || field.key === "clabe" ? "font-mono" : "")}>
                    {field.value}
                  </p>
                </div>
              </div>
              {field.copyable ? <CopyButton value={field.value} /> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
