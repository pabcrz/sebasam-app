"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Landmark, FileText, Banknote } from "lucide-react";
import { PublicDocumentHeader } from "@/features/public-branding/public-document-header";
import { getPublicMapsUrl, type PublicBusinessIdentity } from "@/features/public-branding/domain";

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
  const mapsUrl = getPublicMapsUrl(location?.mapsUrl);
  const badgeInfo = badgeConfig[badge];
  const BadgeIcon = badgeInfo.icon;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <PublicDocumentHeader business={headerBusiness} logoSrc={logoSrc} location={undefined} maxWidthClassName="max-w-6xl" badge={<><BadgeIcon className="h-4 w-4" aria-hidden="true" /><span>{badgeInfo.label}</span></>} />

      <main className="flex-1 bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      <footer className="border-t border-white/10 bg-[var(--color-navy-900)] px-6 py-5 text-[var(--color-on-navy-tint)] md:px-8">
        <div className="mx-auto max-w-6xl">
          {location?.address ? (
            mapsUrl ? <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline transition-colors hover:text-white"
            >
              {location.address}
            </a> : <p className="text-sm">{location.address}</p>
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
