"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { tapAreaClassName } from "./tap-area";

export interface InfoTipProps {
  /** Accessible name of the ⓘ control, e.g. "Qué incluye: Por cobrar". */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * ⓘ next to a short label, holding the longer explanation. Activation toggles
 * it; Escape or moving focus out closes it.
 */
export function InfoTip({ label, children, className }: InfoTipProps) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);

  return (
    <span
      className={cn("relative inline-flex shrink-0 align-middle", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
          tapAreaClassName,
        )}
      >
        <Icon name="info" className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-left text-xs font-normal leading-5 text-[var(--color-text-main)] shadow-[var(--shadow-md)]"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
