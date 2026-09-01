"use client";
import Image from "next/image";
import { MessageCircle, Phone } from "lucide-react";
import type { PublicBusinessIdentity } from "./domain";
export function PublicBrandHeader({ identity, logoSrc, quoteLayout = false }: { identity: PublicBusinessIdentity; logoSrc?: string; quoteLayout?: boolean }) {
  const contacts = identity.phone || identity.whatsapp;

  if (quoteLayout) {
    return <>
      <div className="flex items-center gap-3 print:gap-2">
        {logoSrc ? <Image src={logoSrc} alt={identity.businessName ? `Logo de ${identity.businessName}` : "Logo"} width={52} height={52} className="h-13 w-13 print:h-10 print:w-10 object-contain print:invert" priority /> : null}
        {identity.businessName ? <h1 className="text-3xl font-extrabold leading-none tracking-[-0.05em] md:text-4xl print:text-2xl print:text-black">{identity.businessName}</h1> : null}
      </div>
      {identity.fullName ? <p className="mt-2.5 print:mt-1.5 font-mono text-xs print:text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--color-on-navy-tint)] print:text-gray-700">{identity.fullName}</p> : null}
      {contacts ? <div className="mt-2 print:mt-1 text-xs print:text-[11px] text-white/80 print:text-gray-600 flex flex-wrap gap-4 print:gap-3 items-center">
        {identity.phone ? <a href={`tel:${identity.phone}`} className="flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-700)] print:no-underline"><Phone className="w-3.5 h-3.5 opacity-70 print:opacity-100" aria-hidden="true" />{identity.phone}</a> : null}
        {identity.whatsapp ? <a href={`https://wa.me/52${identity.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-navy-700)] print:no-underline"><MessageCircle className="w-3.5 h-3.5 opacity-70 print:opacity-100" aria-hidden="true" />{identity.whatsapp}</a> : null}
      </div> : null}
    </>;
  }

  return <div className="flex min-w-0 items-start gap-3">
    {logoSrc ? <Image src={logoSrc} alt={identity.businessName ? `Logo de ${identity.businessName}` : "Logo"} width={52} height={52} className="rounded-[var(--radius-md)] bg-white/10 p-1 shadow-md object-contain print:h-10 print:w-10 print:invert" priority /> : null}
    <div className="min-w-0">{identity.businessName ? <h1 className="font-mono text-3xl font-extrabold leading-none tracking-[-0.05em] md:text-4xl">{identity.businessName}</h1> : null}
      {contacts ? <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-white/80 print:text-gray-600">
        {identity.phone ? <a href={`tel:${identity.phone}`} className="flex items-center gap-1.5 rounded-sm print:no-underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{identity.phone}</a> : null}
        {identity.whatsapp ? <a href={`https://wa.me/52${identity.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-sm print:no-underline"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />{identity.whatsapp}</a> : null}
      </div> : null}
    </div>
  </div>;
}
