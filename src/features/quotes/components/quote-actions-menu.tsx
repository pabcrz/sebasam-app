"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

type QuoteActionsMenuProps = {
  quoteNumber: string;
  children: ReactNode;
};

export function QuoteActionsMenu({ quoteNumber, children }: QuoteActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  return (
    <div
      ref={menuRef}
      className="relative"
      data-testid="quote-actions-menu"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        aria-label={`Más acciones de cotización ${quoteNumber}`}
        title={`Más acciones de cotización ${quoteNumber}`}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Acciones de ${quoteNumber}`}
          className="absolute right-0 top-11 z-20 grid min-w-44 gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
