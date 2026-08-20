"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import type { QuoteStatus, SharedQuote } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action?: () => Promise<{ success: boolean; error?: string }>;
  sharedQuote?: Pick<SharedQuote, "token">;
  status: QuoteStatus;
  quoteNumber: string;
  className?: string;
  iconOnly?: boolean;
  actionLabelClassName?: string;
}

export function ShareQuoteButton({ action, sharedQuote, status, quoteNumber, className, iconOnly = false, actionLabelClassName }: ShareQuoteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<"copied" | "manual" | "published" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const isDraft = status === "DRAFT";
  const label = isDraft ? "Preparar y compartir" : "Compartir";
  const shareUrl = sharedQuote
    ? typeof window === "undefined"
      ? `/cotizacion/${sharedQuote.token}`
      : `${window.location.origin}/cotizacion/${sharedQuote.token}`
    : null;

  async function copyUrl() {
    if (!shareUrl) return;
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
    setErrorMessage(null);
    if (!isDraft) {
      void copyUrl();
      return;
    }
    startTransition(async () => {
      try {
        const result = await action?.();
        if (!result?.success) {
          setErrorMessage(result?.error ?? "No se pudo preparar la cotización. Intenta de nuevo.");
          setFeedback("error");
          return;
        }
        setFeedback("published");
        router.refresh();
      } catch {
        setErrorMessage("No se pudo preparar la cotización. Intenta de nuevo.");
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
      aria-label={`${label} cotización ${quoteNumber}`}
      title={`${label} cotización ${quoteNumber}`}
      className={className}
      loading={isPending}
      disabled={isPending}
      onClick={handleShare}
    >
      {!isPending ? (feedback === "copied" ? <Check className="h-5 w-5" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />) : null}
      {!iconOnly && !isPending ? <span className={actionLabelClassName}>{feedback === "copied" ? "Link copiado" : label}</span> : null}
    </Button>
    {feedback === "manual" ? (
      <p role="alert" className="basis-full text-xs text-[var(--color-text-muted)]">
        No se pudo copiar. Selecciona y copia este enlace: <span className="select-all break-all">{shareUrl}</span>
      </p>
    ) : feedback === "error" ? (
      <p role="alert" className="basis-full text-xs text-[var(--color-status-danger-fg)]">{errorMessage}</p>
    ) : feedback === "published" ? (
      <p role="status" className="basis-full text-xs text-[var(--color-status-success-fg)]">Cotización preparada. Actualizando las acciones para compartir.</p>
    ) : feedback === "copied" ? <span role="status" className="sr-only">Link copiado</span> : null}
    </>
  );
}
