"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { tapAreaClassName } from "./tap-area";

/**
 * Lowercases, drops accents (ñ → n, é → e), trims and collapses spaces, so
 * "Muñoz" and "munoz" search the same. Matching itself stays with each screen.
 */
export function normalizeSearchTerm(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
}

const searchHint = "Buscar por folio, cliente, chofer, placas, ECO y concepto";

/** Controlled 36px search field that names what it understands. */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onValueChange, className, ...props }, ref) => (
    <div className={cn("relative flex min-w-0 items-center", className)}>
      <Icon name="search" className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        value={value}
        placeholder={searchHint}
        aria-label={searchHint}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-[var(--control-md)] w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] pl-9 pr-9 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => onValueChange("")}
          className={cn(
            "absolute right-0 top-1/2 flex h-[var(--control-sm)] w-[var(--control-sm)] -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
            tapAreaClassName,
          )}
        >
          <Icon name="close" className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  ),
);
SearchBar.displayName = "SearchBar";
