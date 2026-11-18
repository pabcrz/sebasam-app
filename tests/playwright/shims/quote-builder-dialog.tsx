import * as React from "react";

type QuoteBuilderDialogProps = {
  triggerAriaLabel?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerDisabled?: boolean;
  triggerIconOnly?: boolean;
  quoteNumber?: string;
};

export function QuoteBuilderDialog({
  triggerAriaLabel,
  triggerLabel = "Editar",
  triggerClassName,
  triggerDisabled = false,
  triggerIconOnly = false,
  quoteNumber,
}: QuoteBuilderDialogProps) {
  return (
    <button
      type="button"
      className={triggerClassName}
      aria-label={triggerAriaLabel ?? (quoteNumber ? `Editar cotización ${quoteNumber}` : "Editar cotización")}
      disabled={triggerDisabled}
    >
      <span className={triggerIconOnly ? "sr-only" : undefined}>{triggerLabel}</span>
    </button>
  );
}
