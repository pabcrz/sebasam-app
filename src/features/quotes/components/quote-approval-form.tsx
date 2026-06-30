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
        variant="primary"
        className="w-full"
        loading={isPending}
        disabled={isPending}
        onClick={() => setOpen(true)}
      >
        Aprobar y crear orden de trabajo
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Aprobar cotización"
        description={`¿Confirmas aprobar ${quoteNumber} y crear la orden de trabajo correspondiente? Esta acción no se puede deshacer.`}
        confirmLabel="Aprobar y crear orden"
        cancelLabel="Cancelar"
        variant="default"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
