"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { tapAreaClassName } from "./tap-area";

export type SegmentedControlOption = {
  value: string;
  label: string;
  /** Renders the option as a link; the chosen one gets aria-current="page". */
  href?: string;
};

export type SegmentedControlProps = {
  label: string;
  options: SegmentedControlOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  /** Stretches the control to its container; options share the width equally. */
  fullWidth?: boolean;
};

const containerClassName =
  "no-scrollbar inline-flex max-w-full overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)]";

const optionClassName = cn(
  "relative inline-flex h-[var(--control-md)] shrink-0 items-center justify-center self-stretch whitespace-nowrap rounded-[var(--radius-md)] px-3 text-sm font-medium transition-[background-color,color] duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
  tapAreaClassName,
);

function optionState(selected: boolean) {
  return selected
    ? "bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)] hover:bg-[var(--color-tonal-bg-hover)]"
    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]";
}

/** Filters a list: one option is chosen at a time. Tabs change sections instead. */
export function SegmentedControl({ label, options, value, onValueChange, className, fullWidth = false }: SegmentedControlProps) {
  const hasLinks = options.some((option) => option.href !== undefined);
  const rootClassName = cn(containerClassName, fullWidth && "flex w-full", className);
  const itemClassName = cn(optionClassName, fullWidth && "flex-1");

  if (hasLinks) {
    return (
      <nav aria-label={label} className={rootClassName}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Link
              key={option.value}
              href={option.href ?? ""}
              aria-current={selected ? "page" : undefined}
              className={cn(itemClassName, optionState(selected))}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div role="group" aria-label={label} className={rootClassName}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange?.(option.value)}
            className={cn(itemClassName, optionState(selected))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
