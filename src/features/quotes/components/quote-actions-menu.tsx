"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

type QuoteActionsMenuProps = {
  quoteNumber: string;
  children: ReactNode;
};

export function QuoteActionsMenu({ quoteNumber, children }: QuoteActionsMenuProps) {
  return (
    <details
      className="relative"
      data-testid="quote-actions-menu"
      onClick={(event) => event.stopPropagation()}
    >
      <summary
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] [&::-webkit-details-marker]:hidden"
        aria-label={`Más acciones de cotización ${quoteNumber}`}
        title={`Más acciones de cotización ${quoteNumber}`}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </summary>
      <div
        role="menu"
        aria-label={`Acciones de ${quoteNumber}`}
        className="absolute right-0 top-11 z-20 grid min-w-44 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1 shadow-lg"
      >
        {children}
      </div>
    </details>
  );
}
