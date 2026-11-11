"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
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
  Sheet,
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
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Sheet
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
          <Icon name="user-plus" className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />
          <span className={triggerIconOnly ? "sr-only" : undefined}>Crear usuario</span>
        </Button>
      </DialogTrigger>
      <DialogMobileContent
        variant="sheet"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <DialogMobileHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Registra un nuevo usuario con credenciales de acceso y asignación de rol.
          </DialogDescription>
        </DialogMobileHeader>
        <DialogMobileBody>
          <UserCreateForm
            formId={formId}
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
          />
        </DialogMobileBody>
        <DialogMobileFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="primary" size="lg" loading={isPending} disabled={isPending}>
            {isPending ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogMobileFooter>
      </DialogMobileContent>
    </Sheet>
  );
}
