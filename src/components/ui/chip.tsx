"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { tapAreaClassName } from "./tap-area";

const chipBaseClassName = cn(
  "relative inline-flex h-[var(--control-sm)] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3 text-sm font-medium transition-[background-color,color,outline-color] duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
  tapAreaClassName,
);

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Chosen option; maps to aria-pressed. */
  pressed?: boolean;
}

/** Picks one option from a short set. No border: the chosen one is tonal. */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ pressed = false, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(
        chipBaseClassName,
        pressed
          ? "bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)] hover:bg-[var(--color-tonal-bg-hover)]"
          : "bg-[var(--color-bg-soft)] text-[var(--color-text-main)] hover:bg-[var(--color-tonal-bg)] hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-[var(--color-tonal-fg)]/40",
        className,
      )}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";

/** Adds something ("+ Mano de obra"): dashed border, tonal on hover, no pressed state. */
export const ChipAdd = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        chipBaseClassName,
        "border border-dashed border-[var(--color-border-light)] bg-transparent text-[var(--color-tonal-fg)] hover:bg-[var(--color-tonal-bg)]",
        className,
      )}
      {...props}
    >
      <Icon name="plus" className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  ),
);
ChipAdd.displayName = "ChipAdd";

export type ChipRowProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

/** Keeps chips on one row; when they don't fit, the row scrolls sideways instead of wrapping. */
export function ChipRow({ label, className, ...props }: ChipRowProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto", className)}
      {...props}
    />
  );
}
