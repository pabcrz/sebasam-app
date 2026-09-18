import * as React from "react";
import { getPublicMapsUrl, type PublicBusinessIdentity } from "./domain";
import { PublicBrandHeader } from "./public-brand-header";
import { formatOperationalDate } from "@/features/quotes/lib/format";

export type PublicDocumentUnitData = {
  vehicleDescription?: string | null;
  plate?: string | null;
  economicNumber?: string | null;
  operatorName?: string | null;
};

export interface PublicDocumentHeaderProps {
  business: PublicBusinessIdentity;
  logoSrc?: string;
  documentType?: string;
  documentNumber?: string;
  date?: Date | null;
  customerName?: string;
  customerSubtitle?: string;
  unitData?: PublicDocumentUnitData;
  unitDescription?: string;
  location?: { address?: string; mapsUrl?: string };
  badge?: React.ReactNode;
  maxWidthClassName?: string;
  quoteLayout?: boolean;
}

export function PublicDocumentHeader({ business, logoSrc, documentType, documentNumber, date, customerName, customerSubtitle, unitData, unitDescription, location, badge, maxWidthClassName = "max-w-4xl", quoteLayout = false }: PublicDocumentHeaderProps) {
  const mapsUrl = getPublicMapsUrl(location?.mapsUrl);
  const values = [
    unitData?.vehicleDescription?.trim() ? { label: "", value: unitData.vehicleDescription.trim() } : null,
    unitData?.plate?.trim() ? { label: "Placas", value: unitData.plate.trim() } : null,
    unitData?.economicNumber?.trim() ? { label: "Eco", value: unitData.economicNumber.trim() } : null,
    unitData?.operatorName?.trim() ? { label: "Chofer", value: unitData.operatorName.trim() } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const specialDocumentLabel = unitDescription?.trim();
  const hasDocument = Boolean(documentType || documentNumber || customerName || customerSubtitle || values.length || specialDocumentLabel || date);

  return (
    <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10 print:rounded-none print:bg-none print:px-0 print:pt-0 print:pb-3 print:text-black print:w-full print:overflow-visible">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] print:hidden" />
      <div className={`relative mx-auto ${maxWidthClassName} w-full`}>
        <div className="flex flex-col gap-4 print:gap-2">
          <div className="flex flex-col items-start gap-6 sm:flex-row print:flex-row print:gap-4">
            <div className="flex w-full min-w-0 flex-col sm:w-3/5 print:w-auto print:flex-[11_1_0%]">
              <PublicBrandHeader identity={business} logoSrc={logoSrc} quoteLayout={quoteLayout || hasDocument} />
              {location?.address ? mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block max-w-sm text-xs text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-700)] print:text-gray-600 print:text-[11px] print:no-underline">{location.address}</a> : <p className="mt-1 max-w-sm text-xs text-white/80 print:text-gray-600 print:text-[11px]">{location.address}</p> : null}
            </div>
            {hasDocument ? (
              <div className="flex w-full min-w-0 flex-col rounded-[12px] border border-white/15 bg-white/[0.08] px-4 py-3 backdrop-blur-sm sm:w-2/5 sm:min-w-[18rem] print:w-auto print:flex-[9_1_0%] print:min-w-0 print:rounded-lg print:border-gray-300 print:bg-transparent print:px-3.5 print:py-2.5 print:text-right print:backdrop-blur-none">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-start gap-2 text-left print:gap-0.5 print:text-right">
                    <div className="min-w-0 flex-1 break-words text-left">
                      {customerName ? <p className="text-base font-extrabold leading-snug text-white print:text-black">{customerName}</p> : null}
                      {customerSubtitle ? <p className="hidden text-xs font-medium text-white/80 sm:block print:text-gray-600">{customerSubtitle}</p> : null}
                    </div>
                    {(documentType || documentNumber) ? <div className="min-w-0 shrink-0 max-w-full break-all text-left print:text-right">{documentType ? <span className="block text-xs font-bold uppercase tracking-wider text-white print:text-black">{documentType}</span> : null}{documentNumber ? <span className="block text-xs font-bold tracking-tight text-white/90 print:text-gray-800">{documentNumber}</span> : null}</div> : null}
                  </div>
                  {(values.length > 0 || date || specialDocumentLabel) ? <div className="mt-3 border-t border-white/20 pt-2 print:mt-2 print:border-gray-300 print:pt-1.5" aria-label="Datos de unidad">
                    {values.length > 0 ? <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px] text-white/90 print:gap-x-3 print:text-[10px] print:text-gray-700">{values.map((item) => <span key={`${item.label}-${item.value}`}><span className={item.label ? "text-white/50 print:text-gray-500" : "sr-only"}>{item.label}</span>{item.label ? " " : null}<span className="font-semibold">{item.value}</span></span>)}</div> : null}
                    {date ? <p className="mt-2 text-right text-xs font-semibold text-white/70 print:mt-1 print:text-[11px] print:text-gray-500">{formatOperationalDate(date)}</p> : null}
                    {specialDocumentLabel && !/[.\-·]/.test(specialDocumentLabel) ? <p className="mt-2 text-xs font-medium text-white/90 print:mt-1 print:text-gray-600">{specialDocumentLabel}</p> : null}
                  </div> : null}
                </div>
            ) : null}
          </div>
          {badge ? <div className="inline-flex self-start items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">{badge}</div> : null}
        </div>
      </div>
    </header>
  );
}
