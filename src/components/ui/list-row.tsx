"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export interface ListRowProps {
  /** Accessible name of the whole row, e.g. "Ver detalle de Maestro Pedro". */
  openLabel: string;
  /** Opens the row in place (a sheet or panel). Use `href` to navigate instead. */
  onOpen?: () => void;
  href?: string;
  /** Left content: what identifies the row. */
  children: React.ReactNode;
  /** Right side: the figure that helps decide (amount, count). Display only, never a button. */
  decision?: React.ReactNode;
  /** Chevron that says the row opens. */
  chevron?: boolean;
  className?: string;
}

const rowClassName =
  "flex min-h-[var(--tap-min-height)] w-full min-w-0 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-card)] transition-shadow duration-[var(--motion-fast)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]";

/**
 * Whole-row target for lists (clients, workers, users). The left content names
 * the row; the right side shows the figure that decides. Shadow only, no border.
 */
export function ListRow({ openLabel, onOpen, href, children, decision, chevron = true, className }: ListRowProps) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3">{children}</span>
      {decision != null ? <span className="flex shrink-0 items-center gap-2 text-right">{decision}</span> : null}
      {chevron ? (
        <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={openLabel} className={cn(rowClassName, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={openLabel} onClick={onOpen} className={cn(rowClassName, className)}>
      {content}
    </button>
  );
}
