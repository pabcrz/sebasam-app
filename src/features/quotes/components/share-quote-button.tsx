"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import type { QuoteStatus, SharedQuote } from "@prisma/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action?: () => Promise<{ success: boolean; error?: string }>;
  sharedQuote?: Pick<SharedQuote, "token">;
  status: QuoteStatus;
  quoteNumber: string;
  className?: string;
  variant?: ButtonVariant;
  iconOnly?: boolean;
  actionLabelClassName?: string;
}

export function ShareQuoteButton({
  action,
  sharedQuote,
  status,
  quoteNumber,
  className,
  variant = "outline",
  iconOnly = false,
  actionLabelClassName,
}: ShareQuoteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
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
      toast.error(`No se pudo copiar automáticamente: ${shareUrl}`, {
        id: "quote-share-error",
        duration: 6000,
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace copiado al portapapeles.", { id: "quote-share-copied" });
    } catch {
      toast.error(`No se pudo copiar automáticamente: ${shareUrl}`, {
        id: "quote-share-error",
        duration: 6000,
      });
    }
  }

  function handleShare(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!isDraft) {
      void copyUrl();
      return;
    }
    startTransition(async () => {
      try {
        const result = await action?.();
        if (!result?.success) {
          toast.error(
            result?.error ?? "No se pudo preparar la cotización. Intenta de nuevo.",
            { id: "quote-share-error" }
          );
          return;
        }
        toast.success("Cotización preparada.", { id: "quote-share-prepared" });
        router.refresh();
      } catch {
        toast.error("No se pudo preparar la cotización. Intenta de nuevo.", {
          id: "quote-share-error",
        });
      }
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon" : "sm"}
      aria-label={`${label} cotización ${quoteNumber}`}
      title={`${label} cotización ${quoteNumber}`}
      className={className}
      loading={isPending}
      disabled={isPending}
      onClick={handleShare}
    >
      {!isPending ? <Share2 className="h-5 w-5" aria-hidden="true" /> : null}
      {!iconOnly && !isPending ? (
        <span className={actionLabelClassName}>{label}</span>
      ) : null}
    </Button>
  );
}
