"use client";

import * as React from "react";
import { Button, ConfirmDialog } from "@/components/ui";
import { Trash2 } from "lucide-react";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface CustomerDeleteFormProps {
  action: (formData: FormData) => void | Promise<void>;
  customerId: string;
  customerName: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

export function CustomerDeleteForm({
  action,
  customerId,
  customerName,
  variant = "danger",
  size = "default",
  iconOnly = false,
}: CustomerDeleteFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleConfirm = React.useCallback(() => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customerId", customerId);

      try {
        await action(formData);
      } catch (error) {
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
          throw error;
        }
      } finally {
        setOpen(false);
      }
    });
  }, [action, customerId]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={iconOnly ? "" : "w-full sm:w-fit"}
        loading={isPending}
        disabled={isPending}
        onClick={() => setOpen(true)}
        aria-label={`Eliminar cliente ${customerName}`}
      >
        {!isPending ? <Trash2 className="h-4 w-4" aria-hidden="true" /> : null}
        {!iconOnly && !isPending ? <span>Eliminar cliente</span> : null}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar cliente"
        description={`¿Confirmas eliminar permanentemente a "${customerName}"? Solo es posible si no tiene cotizaciones ni pagos registrados.`}
        confirmLabel="Eliminar cliente"
        cancelLabel="Cancelar"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
