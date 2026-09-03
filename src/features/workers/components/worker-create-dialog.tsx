"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isPending) setOpen(nextOpen); }}>
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
          <UserPlus className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />
          <span className={triggerIconOnly ? "sr-only" : undefined}>Crear trabajador</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (isPending) event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Crear trabajador</DialogTitle>
          <DialogDescription>
            Registra un maestro o ayudante para las asignaciones operativas.
          </DialogDescription>
        </DialogHeader>
        <WorkerCreateForm action={action} isPending={isPending} onSubmit={() => setIsPending(true)} />
      </DialogContent>
    </Dialog>
  );
}
