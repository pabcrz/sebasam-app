"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { Copy } from "lucide-react";

export interface QuoteDuplicateFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  iconOnly?: boolean;
  actionLabelClassName?: string;
}

export function QuoteDuplicateForm({ action, quoteId, iconOnly = false, actionLabelClassName }: QuoteDuplicateFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const handleDuplicate = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setError(null);
      startTransition(async () => {
        const formData = new FormData();
        formData.set("quoteId", quoteId);

        try {
          await action(formData);
        } catch (error) {
          if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
            throw error;
          }
          setError("No se pudo duplicar la cotización. Intenta de nuevo.");
        }
      });
    },
    [action, quoteId]
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "sm"}
        className={iconOnly ? "" : "w-full sm:w-auto"}
        title="Duplicar cotización"
        aria-label="Duplicar cotización"
        loading={isPending}
        disabled={isPending}
        onClick={handleDuplicate}
      >
        {!isPending ? <Copy className="h-5 w-5" aria-hidden="true" /> : null}
        {!iconOnly && !isPending ? <span className={actionLabelClassName}>Duplicar</span> : null}
      </Button>
      {error ? <p role="alert" className="basis-full text-xs text-[var(--color-status-danger-fg)]">{error}</p> : null}
    </>
  );
}
