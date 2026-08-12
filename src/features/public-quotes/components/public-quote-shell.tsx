"use client";

import * as React from "react";
import Image from "next/image";
import { FileText } from "lucide-react";
import { businessPaymentConfig } from "@/config/payment";
import type { ShellBusinessSettings } from "@/features/public-payment/components/public-payment-shell";

export interface PublicQuoteShellProps {
  children: React.ReactNode;
  business?: ShellBusinessSettings;
}

export function PublicQuoteShell({ children, business }: PublicQuoteShellProps) {
  const resolvedBusiness = business ?? businessPaymentConfig;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
        <div className="relative mx-auto max-w-3xl">
          <div className="flex items-start">
            <Image
              src="/logo-white.png"
              alt="SEBASAM"
              width={220}
              height={70}
              className="h-auto w-[180px] object-contain md:w-[220px]"
              priority
            />
          </div>
          <p className="mt-4 max-w-2xl text-sm text-[var(--color-on-navy-tint)] opacity-90 md:text-base">
            {resolvedBusiness.fullName}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Cotización</span>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      <footer className="bg-[var(--color-navy-900)] px-6 py-5 text-[var(--color-on-navy-tint)] md:px-8">
        <div className="mx-auto max-w-3xl">
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
