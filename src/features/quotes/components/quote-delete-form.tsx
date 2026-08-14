"use client";

import * as React from "react";
import { Button, ConfirmDialog } from "@/components/ui";
import { Trash2 } from "lucide-react";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface QuoteDeleteFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  actionLabelClassName?: string;
}

export function QuoteDeleteForm({
  action,
  quoteId,
  quoteNumber,
  variant = "danger",
  size = "sm",
  iconOnly = false,
  actionLabelClassName,
}: QuoteDeleteFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleConfirm = React.useCallback(() => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("quoteId", quoteId);

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
  }, [action, quoteId]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? "icon" : size}
        className={iconOnly ? "" : "w-full"}
        loading={isPending}
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Eliminar cotización ${quoteNumber}`}
        title={`Eliminar cotización ${quoteNumber}`}
      >
        {!isPending ? <Trash2 className="h-5 w-5" aria-hidden="true" /> : null}
        {!iconOnly && !isPending ? <span className={actionLabelClassName}>Eliminar</span> : null}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminar cotización"
        description={`¿Confirmas eliminar ${quoteNumber} de forma permanente? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar cotización"
        cancelLabel="Volver"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
