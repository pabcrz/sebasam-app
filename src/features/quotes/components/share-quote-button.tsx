"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import type { QuoteStatus, SharedQuote } from "@prisma/client";
import { Button } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action?: () => Promise<{ success: boolean; error?: string }>;
  sharedQuote: Pick<SharedQuote, "token">;
  status: QuoteStatus;
  quoteNumber: string;
  className?: string;
  iconOnly?: boolean;
}

export function ShareQuoteButton({ action, sharedQuote, status, quoteNumber, className, iconOnly = false }: ShareQuoteButtonProps) {
  const [isPending, startTransition] = React.useTransition();
  const [published, setPublished] = React.useState(status !== "DRAFT");
  const [feedback, setFeedback] = React.useState<"copied" | "manual" | "error" | null>(null);
  const shareUrl = typeof window === "undefined"
    ? `/cotizacion/${sharedQuote.token}`
    : `${window.location.origin}/cotizacion/${sharedQuote.token}`;

  async function copyUrl() {
    if (!navigator.clipboard?.writeText) {
      setFeedback("manual");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback("copied");
    } catch {
      setFeedback("manual");
    }
  }

  function handleShare(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setFeedback(null);
    if (published) {
      void copyUrl();
      return;
    }
    startTransition(async () => {
      try {
        const result = await action?.();
        if (!result?.success) {
          setFeedback("error");
          return;
        }
        setPublished(true);
        await copyUrl();
      } catch {
        setFeedback("error");
      }
    });
  }

  return (
    <>
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
      {feedback === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      {!iconOnly ? <span>{feedback === "copied" ? "Link copiado" : isPending ? "Compartiendo..." : "Compartir"}</span> : null}
    </Button>
    {feedback === "manual" ? (
      <p role="alert" className="basis-full text-xs text-[var(--color-text-muted)]">
        No se pudo copiar. Selecciona y copia este enlace: <span className="select-all break-all">{shareUrl}</span>
      </p>
    ) : feedback === "error" ? (
      <p role="alert" className="basis-full text-xs text-[var(--color-status-danger-fg)]">No se pudo compartir. Intenta de nuevo.</p>
    ) : feedback === "copied" ? <span role="status" className="sr-only">Link copiado</span> : null}
    </>
  );
}
