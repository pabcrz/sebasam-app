"use client";
import Image from "next/image";
import { MessageCircle, Phone } from "lucide-react";
import type { PublicBusinessIdentity } from "./domain";
export function PublicBrandHeader({ identity, logoSrc }: { identity: PublicBusinessIdentity; logoSrc?: string }) {
  const contacts = identity.phone || identity.whatsapp;
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
