"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";

export interface ShareQuoteButtonProps {
  action: () => Promise<{ success: boolean; token?: string; error?: string }>;
  quoteNumber: string;
  className?: string;
  variant?: ButtonVariant;
  size?: "default" | "sm";
  iconOnly?: boolean;
  actionLabelClassName?: string;
  disabled?: boolean;
}

export function ShareQuoteButton({
  action,
  quoteNumber,
  className,
  variant = "outline",
  size = "sm",
  iconOnly = false,
  actionLabelClassName,
  disabled = false,
}: ShareQuoteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const label = "Compartir";

  function handleShare(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      try {
        const result = await action();
        if (!result?.success) {
          toast.error(
            result?.error ?? "No se pudo preparar la cotización. Intenta de nuevo.",
            { id: "quote-share-error" }
          );
          return;
        }
        if (result.token) {
          const generatedUrl = typeof window === "undefined"
            ? `/cotizacion/${result.token}`
            : `${window.location.origin}/cotizacion/${result.token}`;
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(generatedUrl);
              toast.success("Enlace copiado al portapapeles.", { id: "quote-share-copied" });
            } catch {
              toast.error(`No se pudo copiar automáticamente: ${generatedUrl}`, {
                id: "quote-share-error",
                duration: 6000,
              });
            }
          } else {
            toast.error(`No se pudo copiar automáticamente: ${generatedUrl}`, {
              id: "quote-share-error",
              duration: 6000,
            });
          }
        }
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
      size={iconOnly ? "icon" : size}
      aria-label={`${label} cotización ${quoteNumber}`}
      title={`${label} cotización ${quoteNumber}`}
      className={className}
      loading={isPending}
      disabled={disabled || isPending}
      onClick={handleShare}
    >
      {!isPending ? <Share2 className="h-5 w-5" aria-hidden="true" /> : null}
      {!iconOnly && !isPending ? (
        <span className={actionLabelClassName}>{label}</span>
      ) : null}
    </Button>
  );
}
