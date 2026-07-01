"use client";

import { AlertCircle, Ban, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

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

export interface SharedQuoteErrorStateProps {
  type: SharedQuoteErrorType;
}

export function SharedQuoteErrorState({ type }: SharedQuoteErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Card className="mx-auto max-w-xl border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)]">
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
  );
}
