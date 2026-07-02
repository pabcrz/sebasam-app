"use client";

import { Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { businessPaymentConfig } from "@/config/payment";

export interface ContactSettings {
  phone: string;
  whatsapp: string;
}

export interface ContactCardProps {
  contact?: ContactSettings;
}

export function ContactCard({ contact }: ContactCardProps) {
  const resolvedContact = contact ?? businessPaymentConfig.contact;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Phone className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Teléfono fijo</p>
            <p className="text-sm font-semibold text-[var(--color-text-main)]">{resolvedContact.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">WhatsApp</p>
            <p className="text-sm font-semibold text-[var(--color-text-main)]">{resolvedContact.whatsapp}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
