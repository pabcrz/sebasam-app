"use client";

import * as React from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { Textarea } from "@/components/ui";
import { Label } from "@/components/ui";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface QuoteCorrectDecisionFormProps {
  action: (quoteId: string, nextStatus: "APPROVED" | "REJECTED", reason: string) => Promise<{ success: boolean; error?: string }>;
  quoteId: string;
  quoteNumber: string;
  currentStatus: "APPROVED" | "REJECTED";
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

export function QuoteCorrectDecisionForm({
  action,
  quoteId,
  quoteNumber,
  currentStatus,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: QuoteCorrectDecisionFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const nextStatus = currentStatus === "APPROVED" ? "REJECTED" : "APPROVED";

  const handleConfirm = React.useCallback(() => {
    if (reason.trim().length === 0) {
      setError("El motivo de la corrección es obligatorio.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await action(quoteId, nextStatus, reason.trim());

      if (result.success) {
        setOpen(false);
        setReason("");
      } else {
        setError(result.error ?? "No se pudo corregir la decisión.");
      }
    });
  }, [action, quoteId, nextStatus, reason]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setReason("");
        setError(null);
      }
      setOpen(newOpen);
    },
    [],
  );

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={iconOnly ? "" : "w-full"}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Corregir decisión de cotización ${quoteNumber}`}
        title={`Corregir decisión de cotización ${quoteNumber}`}
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        {!iconOnly && <span>Corregir decisión</span>}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Corregir decisión de cotización</DialogTitle>
            <DialogDescription>
              Estás a punto de cambiar la decisión de la cotización {quoteNumber} de{" "}
              <strong>{currentStatus === "APPROVED" ? "Aprobada" : "Rechazada"}</strong> a{" "}
              <strong>{nextStatus === "APPROVED" ? "Aprobada" : "Rechazada"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="correction-reason">Motivo de la corrección *</Label>
              <Textarea
                id="correction-reason"
                placeholder="Especifica por qué se está corrigiendo la decisión..."
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (error) setError(null);
                }}
                disabled={isPending}
                rows={3}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="primary" loading={isPending} onClick={handleConfirm}>
              Confirmar corrección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
