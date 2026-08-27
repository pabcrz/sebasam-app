"use client";

import * as React from "react";
import Image from "next/image";
import { Phone, MessageCircle } from "lucide-react";
import { businessPaymentConfig } from "@/config/payment";
import { formatOperationalDate } from "@/features/quotes/lib/format";

export interface PublicQuoteShellProps {
  children: React.ReactNode;
  business?: {
    name: string;
    fullName: string;
    address: string;
    mapsUrl: string;
    contactPhone: string;
    contactWhatsapp: string;
  };
  documentType?: string;
  documentNumber?: string;
  date?: Date | null;
  title?: string;
  customerName?: string;
  vehicleDescription?: string;
}

export function PublicQuoteShell({ children, business, documentType = "Cotización", documentNumber, date, customerName, vehicleDescription }: PublicQuoteShellProps) {
  const resolvedBusiness = business ?? businessPaymentConfig;

  return (
    <div className="flex flex-1 min-h-screen flex-col bg-[var(--background)] print:min-h-0 print:bg-white">
      <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10 print:rounded-none print:bg-none print:px-0 print:pt-2 print:pb-3 print:text-black">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 print:hidden" />
        <div className="relative mx-auto max-w-4xl flex flex-col sm:flex-row print:flex-row gap-6 print:gap-4 items-start">
          
          <div className="flex flex-col w-full sm:w-3/5 print:w-3/5">
            <div className="flex items-center gap-3 print:gap-2">
              <Image
                src="/logo-white-short.png"
                alt="Logo de SEBASAM"
                width={52}
                height={52}
                className="h-13 w-13 print:h-10 print:w-10 object-contain print:invert"
                priority
              />
              <h1 className="text-3xl font-extrabold leading-none tracking-[-0.05em] md:text-4xl print:text-2xl print:text-black">
                {resolvedBusiness.name}
              </h1>
            </div>
            <p className="mt-2.5 print:mt-1.5 font-mono text-xs print:text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--color-on-navy-tint)] print:text-gray-700">
              {resolvedBusiness.fullName}
            </p>
            <a href={resolvedBusiness.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 max-w-sm rounded-sm text-xs text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-700)] print:text-gray-600 print:text-[11px] print:no-underline">
              {resolvedBusiness.address}
            </a>
            <div className="mt-2 print:mt-1 text-xs print:text-[11px] text-white/80 print:text-gray-600 flex flex-wrap gap-4 print:gap-3 items-center">
              <a href={`tel:${resolvedBusiness.contactPhone}`} className="flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-700)] print:no-underline">
                <Phone className="w-3.5 h-3.5 opacity-70 print:opacity-100" /> 
                {resolvedBusiness.contactPhone}
              </a>
              <a href={`https://wa.me/52${resolvedBusiness.contactWhatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-700)] print:no-underline">
                <MessageCircle className="w-3.5 h-3.5 opacity-70 print:opacity-100" /> 
                {resolvedBusiness.contactWhatsapp}
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:items-end print:items-end w-full sm:w-2/5 print:w-2/5">
            <div className="flex flex-col w-full border border-white/20 bg-white/5 rounded-[var(--radius-md)] px-4 py-3 print:px-3.5 print:py-2.5 sm:text-right print:text-right print:border-gray-300 print:rounded-lg print:bg-transparent">
              {(customerName || vehicleDescription) && (
                <div className="flex flex-col gap-1 print:gap-0.5 text-left sm:text-right print:text-right pb-2.5 print:pb-2 mb-2.5 print:mb-2 border-b border-white/15 print:border-gray-200">
                  {customerName && (
                    <p className="text-base print:text-base font-extrabold text-white print:text-black leading-snug">
                      {customerName}
                    </p>
                  )}
                  {vehicleDescription && (
                    <p className="text-xs print:text-xs font-medium text-white/90 print:text-gray-600">
                      {vehicleDescription}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col text-right w-full mt-0.5 print:mt-0.5 gap-0.5 print:gap-0.5">
                <div>
                  <span className="block text-xs md:text-sm print:text-xs font-bold uppercase tracking-wider text-white print:text-black mb-0.5">
                    {documentType}
                  </span>
                  <span className="text-xs md:text-sm print:text-xs font-bold tracking-tight text-white/90 print:text-gray-800">
                    {documentNumber || "-"}
                  </span>
                </div>
                
                <span className="text-xs print:text-[11px] font-normal text-white/70 print:text-gray-500">
                  {date ? formatOperationalDate(date) : "—"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 flex flex-col bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8 print:bg-white print:px-0 print:py-0 print:pt-1">
        <div className="mx-auto max-w-4xl flex-1 flex flex-col w-full">{children}</div>
      </main>
    </div>
  );
}
