"use client";

import * as React from "react";
import { Button, ConfirmDialog } from "@/components/ui";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface QuoteCancelFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function QuoteCancelForm({
  action,
  quoteId,
  quoteNumber,
  variant = "outline",
  size = "sm",
}: QuoteCancelFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleConfirm = React.useCallback(() => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("quoteId", quoteId);

      try {
        await action(formData);
      } catch (error) {
        // NEXT_REDIRECT errors must be re-thrown so Next.js can navigate.
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
          throw error;
        }
        // Unexpected failures surface through the query-param toast on the
        // quotes page, so we just close the dialog here.
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
        size={size}
        className="w-full"
        loading={isPending}
        disabled={isPending}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Cancelar cotización ${quoteNumber}`}
      >
        Cancelar
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancelar cotización"
        description={`¿Confirmas cancelar ${quoteNumber}? Esta acción no se puede deshacer.`}
        confirmLabel="Cancelar cotización"
        cancelLabel="Volver"
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
