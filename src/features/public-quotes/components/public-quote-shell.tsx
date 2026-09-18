"use client";

import * as React from "react";
import { type PublicBusinessIdentity } from "@/features/public-branding/domain";
import { PublicDocumentHeader, type PublicDocumentUnitData } from "@/features/public-branding/public-document-header";

const defaultQuoteLogoSrc = "/logo-white-short.png";

export interface PublicQuoteShellProps {
  children: React.ReactNode;
  business?: PublicBusinessIdentity;
  location?: { address?: string; mapsUrl?: string };
  logoSrc?: string;
  documentType?: string;
  documentNumber?: string;
  date?: Date | null;
  title?: string;
  customerName?: string;
  customerSubtitle?: string;
  unitData?: PublicDocumentUnitData;
  /** @deprecated Use unitData for document headers. Kept for legacy shell consumers. */
  vehicleDescription?: string;
  unitDescription?: string;
}

export function PublicQuoteShell({ children, business, location, logoSrc, documentType = "Cotización", documentNumber, date, customerName, customerSubtitle, unitData, unitDescription }: PublicQuoteShellProps) {
  const resolvedBusiness = business ?? {};
  const resolvedLogoSrc = logoSrc ?? (resolvedBusiness.businessName ? defaultQuoteLogoSrc : undefined);

  return (
    <div className="flex flex-1 min-h-screen flex-col bg-[var(--background)] print:min-h-[255mm] print:bg-white print:px-[14mm] print:py-0 print:flex print:flex-col print:flex-1 print:w-full print:overflow-visible">
      <PublicDocumentHeader business={resolvedBusiness} logoSrc={resolvedLogoSrc} documentType={documentType} documentNumber={documentNumber || "-"} date={date} customerName={customerName} customerSubtitle={customerSubtitle} unitData={unitData} unitDescription={unitDescription} location={location} quoteLayout />
      <main className="flex-1 flex flex-col bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8 print:bg-white print:px-0 print:py-0 print:w-full print:flex print:flex-col print:flex-1 print:overflow-visible">
        <div className="mx-auto max-w-4xl flex-1 flex flex-col w-full print:max-w-none print:flex print:flex-col print:flex-1 print:overflow-visible">{children}</div>
      </main>
    </div>
  );
}
