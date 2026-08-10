"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
  className?: string;
}

export function ShareQuoteButton({ action, quoteId, quoteNumber, className }: ShareQuoteButtonProps) {
  const [isPending, startTransition] = React.useTransition();

  const handleShare = React.useCallback(
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
      aria-label={`Compartir cotización ${quoteNumber}`}
      className={className}
      loading={isPending}
      disabled={isPending}
      onClick={handleShare}
    >
      <Share2 className="h-4 w-4" aria-hidden="true" />
      <span>{isPending ? "Compartiendo..." : "Compartir"}</span>
    </Button>
  );
}
