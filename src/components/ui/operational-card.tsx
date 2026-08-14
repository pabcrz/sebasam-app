"use client";

import * as React from "react";
import { clsx } from "clsx";

type OperationalCardProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  className?: string;
  footerClassName?: string;
};

export function OperationalCard({ children, footer, onOpen, openLabel, className, footerClassName }: OperationalCardProps) {
  const bodyClassName = "w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-inset";

  return (
    <div className={clsx("overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm", className)}>
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-label={openLabel} className={clsx(bodyClassName, "cursor-pointer hover:bg-[var(--color-bg-soft)]")}>
          {children}
        </button>
      ) : (
        <div className={bodyClassName}>{children}</div>
      )}
      <div className={clsx("border-t border-[var(--color-border-light)] bg-[var(--color-bg-soft)] px-4 py-3", footerClassName)}>{footer}</div>
    </div>
  );
}
