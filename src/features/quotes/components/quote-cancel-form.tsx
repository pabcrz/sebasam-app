"use client";

import * as React from "react";
import { Button, ConfirmDialog } from "@/components/ui";

export interface QuoteCancelFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
}

export function QuoteCancelForm({ action, quoteId, quoteNumber }: QuoteCancelFormProps) {
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const formAction = React.useCallback(
    async (formData: FormData) => {
      try {
        await action(formData);
      } finally {
        setIsSubmitting(false);
      }
    },
    [action],
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        loading={isSubmitting}
        disabled={isSubmitting}
        onClick={() => setOpen(true)}
      >
        Cancelar cotización
      </Button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="quoteId" value={quoteId} />
      </form>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancelar cotización"
        description={`¿Confirmas cancelar ${quoteNumber}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="Volver"
        variant="danger"
        loading={isSubmitting}
        onConfirm={() => {
          setIsSubmitting(true);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
