"use client";

import * as React from "react";
import { Button, ConfirmDialog } from "@/components/ui";

export interface QuoteApprovalFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
}

export function QuoteApprovalForm({ action, quoteId, quoteNumber }: QuoteApprovalFormProps) {
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
        variant="primary"
        className="w-full"
        loading={isSubmitting}
        disabled={isSubmitting}
        onClick={() => setOpen(true)}
      >
        Aprobar y crear orden de trabajo
      </Button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="quoteId" value={quoteId} />
      </form>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Aprobar cotización"
        description={`¿Confirmas aprobar ${quoteNumber} y crear la orden de trabajo correspondiente? Esta acción no se puede deshacer.`}
        confirmLabel="Aprobar y crear orden"
        cancelLabel="Cancelar"
        loading={isSubmitting}
        onConfirm={() => {
          setIsSubmitting(true);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
