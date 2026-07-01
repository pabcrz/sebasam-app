"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
}

export function ShareQuoteButton({ action, quoteId, quoteNumber }: ShareQuoteButtonProps) {
  return (
    <form action={action}>
      <input type="hidden" name="quoteId" value={quoteId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        aria-label={`Compartir cotización ${quoteNumber}`}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span>Compartir</span>
      </Button>
    </form>
  );
}
