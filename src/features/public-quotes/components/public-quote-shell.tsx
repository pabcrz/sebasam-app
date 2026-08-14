"use client";

import * as React from "react";
import Image from "next/image";
import { FileText, Phone, MessageCircle } from "lucide-react";
import { businessPaymentConfig } from "@/config/payment";
import { formatDate } from "@/features/quotes/lib/format";

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

export function PublicQuoteShell({ children, business, documentType = "Cotización", documentNumber, date, title, customerName, vehicleDescription }: PublicQuoteShellProps) {
  const resolvedBusiness = business ?? businessPaymentConfig;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] print:min-h-0 print:bg-white">
      <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10 print:rounded-none print:bg-none print:px-0 print:py-4 print:text-black">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60 print:hidden" />
        <div className="relative mx-auto max-w-4xl flex flex-col sm:flex-row print:flex-row gap-6 items-start">
          
          <div className="flex flex-col w-full sm:w-3/5 print:w-3/5">
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
            <div className="mt-2 text-xs text-white/80 print:text-gray-600 flex flex-wrap gap-4 items-center">
              <a href={`tel:${resolvedBusiness.contactPhone}`} className="hover:text-white transition-colors print:no-underline flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 opacity-70" /> 
                {resolvedBusiness.contactPhone}
              </a>
              <a href={`https://wa.me/52${resolvedBusiness.contactWhatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors print:no-underline flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 opacity-70" /> 
                {resolvedBusiness.contactWhatsapp}
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:items-end print:items-end w-full sm:w-2/5 print:w-2/5">
            <div className="flex flex-col w-full border border-white/20 bg-white/5 rounded-[var(--radius-md)] px-4 py-3 sm:text-right print:text-right print:border-gray-300 print:bg-transparent">
              {(customerName || vehicleDescription) && (
                <div className="flex flex-col gap-1.5 text-left sm:text-right print:text-right pb-2.5 mb-2.5 border-b border-white/10 print:border-gray-200">
                  {customerName && (
                    <p className="text-sm font-bold text-white print:text-black leading-tight">
                      {customerName}
                    </p>
                  )}
                  {vehicleDescription && (
                    <p className="text-xs text-white/90 print:text-gray-700">
                      {vehicleDescription}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col text-right w-full mt-1 gap-1">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/80 print:text-gray-500 mb-0.5">
                    {documentType}
                  </span>
                  <span className="text-base font-bold tracking-tight text-white print:text-black">
                    {documentNumber || "-"}
                  </span>
                </div>
                
                <span className="text-sm font-normal text-white/90 print:text-gray-700">
                  {date ? formatDate(date) : "—"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </header>

      <main className="flex-1 bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8 print:bg-white print:px-0 print:py-0 print:pt-2">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
