"use client";

import { Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export interface ContactSettings {
  phone?: string;
  whatsapp?: string;
}

export interface ContactCardProps {
  contact?: ContactSettings;
}

export function ContactCard({ contact }: ContactCardProps) {
  const resolvedContact = contact ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {resolvedContact.phone ? <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-3 shadow-[var(--shadow-xs)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[var(--color-primary)]">
            <Phone className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Teléfono fijo</p>
            <p className="text-sm font-semibold text-[var(--color-text-main)]">{resolvedContact.phone}</p>
          </div>
        </div> : null}

        {resolvedContact.whatsapp ? <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-3 shadow-[var(--shadow-xs)]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[var(--color-primary)]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">WhatsApp</p>
            <p className="text-sm font-semibold text-[var(--color-text-main)]">{resolvedContact.whatsapp}</p>
          </div>
        </div> : null}
      </CardContent>
    </Card>
  );
}
