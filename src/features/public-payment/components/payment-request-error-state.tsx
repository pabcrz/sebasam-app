"use client";

import { AlertCircle, Clock, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";

export type PaymentRequestErrorType = "not-found" | "expired" | "cancelled";

const errorConfig: Record<PaymentRequestErrorType, { icon: React.ElementType; title: string; message: string }> = {
  "not-found": {
    icon: AlertCircle,
    title: "Enlace no válido",
    message: "El enlace de pago que abriste no existe o es incorrecto. Verifica la URL o contacta al taller.",
  },
  expired: {
    icon: Clock,
    title: "Enlace vencido",
    message: "Este enlace de pago ya expiró. Solicita uno nuevo si aún necesitas realizar el pago.",
  },
  cancelled: {
    icon: Ban,
    title: "Enlace cancelado",
    message: "Este enlace de pago fue cancelado. Contacta al taller para más información.",
  },
};

export interface PaymentRequestErrorStateProps {
  type: PaymentRequestErrorType;
}

export function PaymentRequestErrorState({ type }: PaymentRequestErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Card className="mx-auto max-w-xl border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] print:shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-[var(--color-status-danger-fg)]" aria-hidden="true" />
          <CardTitle className="text-[var(--color-status-danger-fg)]">{config.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-[var(--color-status-danger-fg)] opacity-90">{config.message}</CardDescription>
      </CardContent>
    </Card>
  );
}
