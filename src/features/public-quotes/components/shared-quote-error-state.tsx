"use client";

import { AlertCircle, Ban, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { PublicBrandHeader } from "@/features/public-branding/public-brand-header";

export type SharedQuoteErrorType = "not-found" | "expired" | "revoked";

const errorConfig: Record<SharedQuoteErrorType, { icon: React.ElementType; title: string; message: string }> = {
  "not-found": {
    icon: AlertCircle,
    title: "Link inválido",
    message: "El link de cotización que abriste no existe o es incorrecto. Verifica la URL o contacta al taller.",
  },
  expired: {
    icon: Clock,
    title: "Link expirado",
    message: "Este link ha expirado. Solicita una nueva cotización si aún te interesa el servicio.",
  },
  revoked: {
    icon: Ban,
    title: "Cotización no disponible",
    message: "Esta cotización ya no está disponible. Contacta al taller para más información.",
  },
};

const publicQuoteErrorIdentity = {
  businessName: "SEBASAM",
  fullName: "Servicio y Refacciones para Suspensiones de Aire y Muelles",
};

const publicQuoteErrorLogoSrc = "/logo-white-short.png";

export interface SharedQuoteErrorStateProps {
  type: SharedQuoteErrorType;
}

export function SharedQuoteErrorState({ type }: SharedQuoteErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="relative isolate overflow-hidden bg-[image:var(--gradient-primary)] px-6 pb-6 pt-8 text-white md:rounded-b-[22px] md:px-8 md:pb-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px] opacity-60" />
        <div className="relative mx-auto max-w-xl">
          <PublicBrandHeader identity={publicQuoteErrorIdentity} logoSrc={publicQuoteErrorLogoSrc} quoteLayout />
        </div>
      </header>

      <main className="flex flex-1 items-center bg-[var(--color-bg-soft)] px-4 py-6 md:px-8 md:py-8">
        <Card className="mx-auto w-full max-w-xl border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] print:shadow-none">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-[var(--color-status-danger-fg)]" aria-hidden="true" />
              <CardTitle className="text-[var(--color-status-danger-fg)]">{config.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-[var(--color-status-danger-fg)] opacity-90">
              {config.message}
            </CardDescription>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
