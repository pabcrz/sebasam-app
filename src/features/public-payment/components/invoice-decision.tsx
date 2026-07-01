"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Banknote, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";

export interface InvoiceDecisionProps {
  onDecision: (requiresInvoice: boolean) => void;
  isPending?: boolean;
}

export function InvoiceDecision({ onDecision, isPending = false }: InvoiceDecisionProps) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>¿Qué necesitas compartir?</CardTitle>
        <CardDescription>
          Los flujos están separados para no mezclar captura fiscal con visualización de datos bancarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onDecision(false)}
          className={clsx(
            "flex w-full items-center gap-4 rounded-xl border bg-[var(--color-blue-tint)] p-4 text-left transition-colors",
            "border-[var(--color-primary)] hover:bg-[#d9e7f7]",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
            "disabled:opacity-60",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[var(--color-primary)]">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--color-text-main)]">Solo datos de pago</p>
            <p className="text-xs text-[var(--color-text-muted)]">Ver cuenta, CLABE y contacto</p>
          </div>
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => onDecision(true)}
          className={clsx(
            "flex w-full items-center gap-4 rounded-xl border bg-[var(--color-surface)] p-4 text-left transition-colors",
            "border-[var(--color-border-light)] hover:bg-[var(--color-bg-soft)]",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
            "disabled:opacity-60",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--color-text-main)]">Requiero factura</p>
            <p className="text-xs text-[var(--color-text-muted)]">Capturar datos fiscales primero</p>
          </div>
        </button>

        {isPending ? (
          <Button variant="outline" disabled className="w-full">
            Guardando...
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
