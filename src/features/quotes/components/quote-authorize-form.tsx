"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
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

export interface QuoteAuthorizeFormProps {
  action: (note: string) => Promise<{ success: boolean; error?: string }>;
  quoteNumber: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function QuoteAuthorizeForm({
  action,
  quoteNumber,
  variant = "outline",
  size = "sm",
}: QuoteAuthorizeFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = React.useCallback(() => {
    if (note.trim().length === 0) {
      setError("La nota de autorización es obligatoria.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await action(note);
      if (result.success) {
        setOpen(false);
        setNote("");
      } else {
        setError(result.error ?? "No se pudo autorizar la cotización.");
      }
    });
  }, [action, note]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setNote("");
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
        size={size}
        className="w-full"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Autorizar cotización ${quoteNumber}`}
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        <span>Autorizar</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Autorizar cotización</DialogTitle>
            <DialogDescription>
              Registra la autorización de {quoteNumber} con el canal o motivo por el cual el cliente confirmó.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="authorize-note">Nota de autorización</Label>
            <Textarea
              id="authorize-note"
              placeholder="Ej. Cliente confirmó por WhatsApp, aceptó por teléfono, autorización presencial…"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                if (error) setError(null);
              }}
              disabled={isPending}
              rows={3}
            />
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
              Autorizar cotización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
