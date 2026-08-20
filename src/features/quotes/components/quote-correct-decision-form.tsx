"use client";

import * as React from "react";
import { RefreshCcw, CheckCircle2, FileEdit, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export type CorrectableStatus = "APPROVED" | "REJECTED" | "DRAFT";

export interface QuoteCorrectDecisionFormProps {
  action: (quoteId: string, nextStatus: CorrectableStatus) => Promise<{ success: boolean; error?: string }>;
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
  const [error, setError] = React.useState<string | null>(null);

  const defaultNext: CorrectableStatus = currentStatus === "REJECTED" ? "DRAFT" : "REJECTED";
  const [selectedStatus, setSelectedStatus] = React.useState<CorrectableStatus>(defaultNext);

  const handleOpen = React.useCallback(() => {
    setSelectedStatus(currentStatus === "REJECTED" ? "DRAFT" : "REJECTED");
    setError(null);
    setOpen(true);
  }, [currentStatus]);

  const handleConfirm = React.useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await action(quoteId, selectedStatus);

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? "No se pudo corregir la decisión.");
      }
    });
  }, [action, quoteId, selectedStatus]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setSelectedStatus(currentStatus === "REJECTED" ? "DRAFT" : "REJECTED");
      }
      setError(null);
      setOpen(newOpen);
    },
    [currentStatus],
  );

  const options: Array<{
    value: CorrectableStatus;
    title: string;
    description: string;
    icon: typeof CheckCircle2;
  }> =
    currentStatus === "REJECTED"
      ? [
          {
            value: "DRAFT",
            title: "Regresar a Borrador",
            description: "Permite volver a editar conceptos, montos o reenviarla si el cliente declinó por accidente.",
            icon: FileEdit,
          },
          {
            value: "APPROVED",
            title: "Aceptar cotización",
            description: "Marca la cotización como aceptada y autoriza todas sus secciones.",
            icon: CheckCircle2,
          },
        ]
      : [
          {
            value: "REJECTED",
            title: "Declinar cotización",
            description: "Marca la cotización como declinada por el cliente.",
            icon: XCircle,
          },
          {
            value: "DRAFT",
            title: "Regresar a Borrador",
            description: "Regresa la cotización a borrador para realizar modificaciones antes de continuar.",
            icon: FileEdit,
          },
        ];

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={iconOnly ? "" : "w-full"}
        onClick={(event) => {
          event.stopPropagation();
          handleOpen();
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
              La cotización {quoteNumber} está actualmente{" "}
              <strong>{currentStatus === "APPROVED" ? "Aceptada" : "Declinada"}</strong>.
              Selecciona el estado al que deseas cambiarla:
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2" role="radiogroup" aria-label="Nuevo estado">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedStatus === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border-light)] hover:bg-[var(--color-bg-soft)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="nextStatus"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setSelectedStatus(opt.value)}
                    className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-1.5 font-medium text-[var(--color-text-main)]">
                      <Icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                      <span>{opt.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{opt.description}</p>
                  </div>
                </label>
              );
            })}
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
