"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { Copy } from "lucide-react";

export interface QuoteDuplicateFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
}

export function QuoteDuplicateForm({ action, quoteId }: QuoteDuplicateFormProps) {
  const [isPending, startTransition] = React.useTransition();

  const handleDuplicate = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      startTransition(async () => {
        const formData = new FormData();
        formData.set("quoteId", quoteId);

        try {
          await action(formData);
        } catch (error) {
          if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
            throw error;
          }
        }
      });
    },
    [action, quoteId]
  );

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title="Duplicar cotización"
      loading={isPending}
      disabled={isPending}
      onClick={handleDuplicate}
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        {isPending ? "Duplicando..." : "Duplicar"}
      </span>
    </Button>
  );
}
