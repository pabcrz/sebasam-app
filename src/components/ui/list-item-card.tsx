"use client";

import * as React from "react";
import { clsx } from "clsx";

type ListItemCardProps = {
  body: React.ReactNode;
  actions?: React.ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  className?: string;
  bodyClassName?: string;
  actionsClassName?: string;
};

export function ListItemCard({
  body,
  actions,
  onOpen,
  openLabel,
  className,
  bodyClassName,
  actionsClassName,
}: ListItemCardProps) {
  const contentClassName = clsx(
    "min-w-0 flex-1 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2",
    bodyClassName,
  );

  return (
     <div className={clsx("w-full rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-start gap-4">
        {onOpen ? (
          <button type="button" onClick={onOpen} aria-label={openLabel} className={clsx(contentClassName, "cursor-pointer hover:bg-[var(--color-surface-muted)]")}>
            {body}
          </button>
        ) : (
          <div className={contentClassName}>{body}</div>
        )}
        {actions != null ? <div className={clsx("shrink-0", actionsClassName)}>{actions}</div> : null}
      </div>
    </div>
  );
}
