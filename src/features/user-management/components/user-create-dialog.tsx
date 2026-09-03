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
import { UserCreateForm } from "./user-create-form";

export interface UserCreateDialogProps {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  triggerVariant?: ButtonVariant;
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerClassName?: string;
  triggerIconOnly?: boolean;
  triggerAriaLabel?: string;
}

export function UserCreateDialog({
  action,
  triggerVariant = "primary",
  triggerSize,
  triggerClassName,
  triggerIconOnly = false,
  triggerAriaLabel,
}: UserCreateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName ?? "w-full sm:w-fit"}
          disabled={isPending}
          title={triggerAriaLabel ?? (triggerIconOnly ? "Crear usuario" : undefined)}
          aria-label={triggerAriaLabel ?? (triggerIconOnly ? "Crear usuario" : undefined)}
        >
          <UserPlus className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />
          <span className={triggerIconOnly ? "sr-only" : undefined}>Crear usuario</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Registra un nuevo usuario con credenciales de acceso y asignación de rol.
          </DialogDescription>
        </DialogHeader>
        <UserCreateForm
          action={async (formData) => {
            setIsPending(true);
            try {
              const res = await action(formData);
              return res;
            } finally {
              setIsPending(false);
            }
          }}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
