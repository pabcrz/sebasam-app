"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
  className?: string;
  iconOnly?: boolean;
}

export function ShareQuoteButton({ action, quoteId, quoteNumber, className, iconOnly = false }: ShareQuoteButtonProps) {
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
      size={iconOnly ? "icon" : "sm"}
      aria-label={`Compartir cotización ${quoteNumber}`}
      className={className}
      loading={isPending}
      disabled={isPending}
      onClick={handleShare}
    >
      <Share2 className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-2"} aria-hidden="true" />
      {!iconOnly && <span>{isPending ? "Compartiendo..." : "Compartir"}</span>}
    </Button>
  );
}
