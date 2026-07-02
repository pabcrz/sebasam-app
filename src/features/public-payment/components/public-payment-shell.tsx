"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Landmark, FileText, Banknote } from "lucide-react";
import { businessPaymentConfig } from "@/config/payment";

export interface ShellBusinessSettings {
  name: string;
  fullName: string;
  address: string;
  mapsUrl: string;
}

export interface PublicPaymentShellProps {
  children: React.ReactNode;
  badge?: "payment" | "invoice" | "payment-and-invoice";
  business?: ShellBusinessSettings;
}

const badgeConfig = {
  payment: {
    icon: Banknote,
    label: "Datos para transferencia",
  },
  invoice: {
    icon: FileText,
    label: "Captura para factura",
  },
  "payment-and-invoice": {
    icon: Landmark,
    label: "Pagos y facturación",
  },
};

export function PublicPaymentShell({ children, badge = "payment-and-invoice", business }: PublicPaymentShellProps) {
  const resolvedBusiness = business ?? businessPaymentConfig;
  const badgeInfo = badgeConfig[badge];
  const BadgeIcon = badgeInfo.icon;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{resolvedBusiness.name}</h1>
          <p className="mt-2 text-sm text-[var(--color-on-navy-tint)] opacity-90 md:text-base">
            {resolvedBusiness.fullName}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <BadgeIcon className="h-4 w-4" aria-hidden="true" />
            <span>{badgeInfo.label}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <footer className="bg-[var(--color-navy-900)] px-6 py-5 text-[var(--color-on-navy-tint)] md:px-8">
        <div className="mx-auto max-w-6xl">
          <a
            href={resolvedBusiness.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline transition-colors hover:text-white"
          >
            {resolvedBusiness.address}
          </a>
          <p className="mt-1 text-xs opacity-70">Dirección del taller · confirmar antes de visitar.</p>
        </div>
      </footer>
    </div>
  );
}

export function PublicPaymentContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("grid gap-4 md:grid-cols-2 md:gap-6", className)}>
      {children}
    </div>
  );
}
