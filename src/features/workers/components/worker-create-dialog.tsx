"use client";

import * as React from "react";
import {
  Button,
  DialogClose,
  DialogDescription,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
  Icon,
  Sheet,
} from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";
import { WorkerCreateForm } from "./worker-create-form";

type WorkerCreateDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  triggerVariant?: ButtonVariant;
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerClassName?: string;
  triggerIconOnly?: boolean;
  triggerAriaLabel?: string;
};

export function WorkerCreateDialog({ action, triggerVariant = "primary", triggerSize, triggerClassName, triggerIconOnly = false, triggerAriaLabel }: WorkerCreateDialogProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!isPending) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName ?? "w-full sm:w-fit"}
          disabled={isPending}
          title={triggerAriaLabel ?? (triggerIconOnly ? "Crear trabajador" : undefined)}
          aria-label={triggerAriaLabel ?? (triggerIconOnly ? "Crear trabajador" : undefined)}
        >
          <Icon name="user-plus" className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />
          <span className={triggerIconOnly ? "sr-only" : undefined}>Crear trabajador</span>
        </Button>
      </DialogTrigger>
      <DialogMobileContent
        variant="sheet"
        onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (isPending) event.preventDefault(); }}
      >
        <DialogMobileHeader>
          <DialogTitle>Crear trabajador</DialogTitle>
          <DialogDescription>
            Registra un maestro o ayudante para las asignaciones operativas.
          </DialogDescription>
        </DialogMobileHeader>
        <DialogMobileBody>
          <WorkerCreateForm formId={formId} action={action} isPending={isPending} onSubmit={() => setIsPending(true)} />
        </DialogMobileBody>
        <DialogMobileFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="primary" size="lg" loading={isPending} disabled={isPending}>
            Crear trabajador
          </Button>
        </DialogMobileFooter>
      </DialogMobileContent>
    </Sheet>
  );
}
