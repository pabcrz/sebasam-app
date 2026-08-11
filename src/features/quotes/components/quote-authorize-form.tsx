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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

import { useRouter } from "next/navigation";

export interface QuoteAuthorizeFormProps {
  action: (note: string) => Promise<{ success: boolean; error?: string }>;
  quoteNumber: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const AUTHORIZATION_METHODS = [
  "Confirmación por WhatsApp",
  "Llamada telefónica",
  "Autorización presencial / Verbal",
  "Otro",
];

export function QuoteAuthorizeForm({
  action,
  quoteNumber,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: QuoteAuthorizeFormProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [method, setMethod] = React.useState<string>("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = React.useCallback(() => {
    if (!method) {
      setError("Debes seleccionar un método de autorización.");
      return;
    }
    
    if (method === "Otro" && note.trim().length === 0) {
      setError("La nota es obligatoria si seleccionas 'Otro'.");
      return;
    }

    const finalNote = note.trim() 
      ? (method === "Otro" ? note.trim() : `${method} - ${note.trim()}`) 
      : method;

    setError(null);
    startTransition(async () => {
      const result = await action(finalNote);
      if (result.success) {
        setOpen(false);
        setMethod("");
        setNote("");
        router.refresh();
      } else {
        setError(result.error ?? "No se pudo autorizar la cotización.");
      }
    });
  }, [action, method, note, router]);


  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setMethod("");
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
        size={iconOnly ? "icon" : size}
        className={iconOnly ? "" : "w-full"}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Autorizar cotización ${quoteNumber}`}
      >
        <ShieldCheck className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} aria-hidden="true" />
        {!iconOnly && <span>Autorizar</span>}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Autorizar cotización</DialogTitle>
            <DialogDescription>
              Registra la autorización de {quoteNumber} con el canal o motivo por el cual el cliente confirmó.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="authorize-method">Medio de confirmación *</Label>
              <Select
                value={method}
                onValueChange={(val) => {
                  setMethod(val);
                  if (error) setError(null);
                }}
                disabled={isPending}
              >
                <SelectTrigger id="authorize-method">
                  <SelectValue placeholder="Selecciona el método..." />
                </SelectTrigger>
                <SelectContent>
                  {AUTHORIZATION_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authorize-note">
                Detalles u observaciones {method === "Otro" ? "*" : "(opcional)"}
              </Label>
              <Textarea
                id="authorize-note"
                placeholder={method === "Otro" ? "Especifica cómo autorizó el cliente..." : "Ej. Dejó anticipo en efectivo..."}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
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
              Autorizar cotización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
