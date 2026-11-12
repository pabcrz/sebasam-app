"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";
import { getMeaningfulTextError } from "@/lib/meaningful-text";

export interface CustomerCreateFormProps {
  action: (formData: FormData) => void | Promise<void>;
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerIconOnly?: boolean;
  triggerAriaLabel?: string;
}

export function CustomerCreateForm({ action, triggerVariant, triggerClassName, triggerSize, triggerIconOnly = false, triggerAriaLabel }: CustomerCreateFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [name, setName] = React.useState("");
  const nameError = name === "" ? null : getMeaningfulTextError(name, "nombre");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (getMeaningfulTextError(name, "nombre")) return;
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      await action(formData);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isPending) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName ?? "w-full sm:w-fit"}
          disabled={isPending}
          title={triggerAriaLabel ?? (triggerIconOnly ? "Nuevo cliente" : undefined)}
          aria-label={triggerAriaLabel ?? (triggerIconOnly ? "Nuevo cliente" : undefined)}
        >
          <Icon name="user-plus" className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />
          <span className={triggerIconOnly ? "sr-only" : undefined}>Nuevo cliente</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg"
        onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (isPending) event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Registra los datos del cliente. Solo el nombre es obligatorio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4" data-testid="customer-create-form">
          <input type="hidden" name="commercialName" value="" />
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" placeholder="Ej. Juan Pérez o Grúas Mejía" required disabled={isPending} value={name} onChange={(event) => setName(event.target.value)} aria-describedby={nameError ? "customer-name-error" : undefined} aria-invalid={nameError ? true : undefined} />
            <span id="customer-name-error" role={nameError ? "alert" : undefined} className="min-h-4 text-xs text-[var(--color-status-danger-fg)]">
              {nameError}
            </span>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="legalName">Razón social formal (opcional)</Label>
            <Input id="legalName" name="legalName" placeholder="Ej. Grúas Mejía Cuautla S.A. de C.V." disabled={isPending} />
          </div>
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Operador o Chofer inicial (opcional)
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="initialContactName">Nombre o apodo del operador</Label>
                <Input
                  id="initialContactName"
                  name="initialContactName"
                  placeholder="Ej. El Mariachi / Juanito"
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="initialContactPhone">Teléfono del operador (opcional)</Label>
                <Input
                  id="initialContactPhone"
                  name="initialContactPhone"
                  type="tel"
                  inputMode="tel"
                  maxLength={20}
                  placeholder="55 1234 5678"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="cliente@ejemplo.com" disabled={isPending} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              maxLength={20}
              placeholder="55 1234 5678"
              disabled={isPending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea id="address" name="address" placeholder="Calle, número, colonia..." rows={3} disabled={isPending} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" placeholder="Información adicional..." rows={3} disabled={isPending} />
          </div>
          <p role="status" className="sr-only">
            {isPending ? "Creando cliente..." : ""}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={isPending} disabled={isPending}>
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
