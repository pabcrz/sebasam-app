"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Landmark, FileText, Banknote } from "lucide-react";
import { PublicBrandHeader } from "@/features/public-branding/public-brand-header";
import type { PublicBusinessIdentity } from "@/features/public-branding/domain";

export type ShellBusinessSettings = PublicBusinessIdentity;

export interface PublicPaymentShellProps {
  children: React.ReactNode;
  badge?: "payment" | "invoice" | "payment-and-invoice";
  business?: ShellBusinessSettings;
  location?: { address?: string; mapsUrl?: string };
  logoSrc?: string;
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

export function PublicPaymentShell({ children, badge = "payment-and-invoice", business, location, logoSrc }: PublicPaymentShellProps) {
  const resolvedBusiness = business ?? {};
  const headerBusiness = { ...resolvedBusiness, phone: undefined, whatsapp: undefined };
  const badgeInfo = badgeConfig[badge];
  const BadgeIcon = badgeInfo.icon;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
        <div className="relative mx-auto max-w-6xl">
          <PublicBrandHeader identity={headerBusiness} logoSrc={logoSrc} />

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <BadgeIcon className="h-4 w-4" aria-hidden="true" />
            <span>{badgeInfo.label}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <footer className="bg-[var(--color-navy-900)] px-6 py-5 text-[var(--color-on-navy-tint)] md:px-8">
        <div className="mx-auto max-w-6xl">
          {location?.address ? (
            <a
              href={location.mapsUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline transition-colors hover:text-white"
            >
              {location.address}
            </a>
          ) : null}
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
