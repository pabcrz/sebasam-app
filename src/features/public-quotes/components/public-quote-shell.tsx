"use client";

import * as React from "react";
import Image from "next/image";
import { FileText } from "lucide-react";
import { businessPaymentConfig } from "@/config/payment";
import { formatDate } from "@/features/quotes/lib/format";

export interface PublicQuoteShellProps {
  children: React.ReactNode;
  business?: ShellBusinessSettings;
  documentType?: string;
  documentNumber?: string;
  date?: Date | null;
}

export function PublicQuoteShell({ children, business, documentType = "Cotización", documentNumber, date }: PublicQuoteShellProps) {
  const resolvedBusiness = business ?? businessPaymentConfig;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] print:min-h-0 print:bg-white">
      <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10 print:rounded-none print:bg-none print:px-0 print:py-4 print:text-black">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 print:hidden" />
        <div className="relative mx-auto max-w-4xl flex flex-col sm:flex-row print:flex-row justify-between gap-6 items-start">
          
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-white-short.png"
                alt="Logo de SEBASAM"
                width={52}
                height={52}
                className="h-13 w-13 object-contain print:invert"
                priority
              />
              <h1 className="text-3xl font-extrabold leading-none tracking-[-0.05em] md:text-4xl">
                {resolvedBusiness.name}
              </h1>
            </div>
            <p className="mt-3 font-medium text-sm text-[var(--color-on-navy-tint)] print:text-gray-800">
              {resolvedBusiness.fullName}
            </p>
            <a href={resolvedBusiness.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 max-w-sm text-xs text-white/80 hover:text-white transition-colors print:text-gray-600 print:no-underline">
              {resolvedBusiness.address}
            </a>
            <p className="mt-1 text-xs text-white/80 print:text-gray-600 flex gap-2">
              <a href={`tel:${resolvedBusiness.contactPhone}`} className="hover:text-white transition-colors print:no-underline">Tel: {resolvedBusiness.contactPhone}</a>
              <span>·</span>
              <a href={`https://wa.me/52${resolvedBusiness.contactWhatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors print:no-underline">WhatsApp: {resolvedBusiness.contactWhatsapp}</a>
            </p>
          </div>

          <div className="flex flex-col sm:items-end print:items-end w-full sm:w-auto">
            <div className="inline-flex flex-col border border-white/20 bg-white/5 rounded-[var(--radius-md)] px-3 py-2 sm:text-right print:text-right print:border-gray-300 print:bg-transparent">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-white/80 print:text-gray-600">
                {documentType}
              </span>
              <span className="text-lg font-bold tracking-tight mt-0.5 print:text-black">
                {documentNumber || "—"}
              </span>
            </div>
            {date ? (
              <p className="mt-3 text-sm sm:text-right print:text-right text-white/90 print:text-gray-600">
                Fecha: <span className="font-medium print:text-black">{formatDate(date)}</span>
              </p>
            ) : null}
          </div>

        </div>
      </header>

      <main className="flex-1 bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8 print:bg-white print:px-0 print:py-0 print:pt-2">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
