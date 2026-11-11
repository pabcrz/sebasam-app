"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Icon, type IconName } from "@/components/ui";

export type PaymentRequestErrorType = "not-found" | "expired" | "cancelled";

const errorConfig: Record<PaymentRequestErrorType, { icon: IconName; title: string; message: string }> = {
  "not-found": {
    icon: "alert",
    title: "Enlace no válido",
    message: "El enlace de pago que abriste no existe o es incorrecto. Verifica la URL o contacta al taller.",
  },
  expired: {
    icon: "clock",
    title: "Enlace vencido",
    message: "Este enlace de pago ya expiró. Solicita uno nuevo si aún necesitas realizar el pago.",
  },
  cancelled: {
    icon: "ban",
    title: "Enlace cancelado",
    message: "Este enlace de pago fue cancelado. Contacta al taller para más información.",
  },
};

export interface PaymentRequestErrorStateProps {
  type: PaymentRequestErrorType;
}

export function PaymentRequestErrorState({ type }: PaymentRequestErrorStateProps) {
  const config = errorConfig[type];
  return (
    <Card className="mx-auto max-w-xl border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] print:shadow-none">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon name={config.icon} className="h-6 w-6 text-[var(--color-status-danger-fg)]" aria-hidden="true" />
          <CardTitle className="text-[var(--color-status-danger-fg)]">{config.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-[var(--color-status-danger-fg)] opacity-90">{config.message}</CardDescription>
      </CardContent>
    </Card>
  );
}
