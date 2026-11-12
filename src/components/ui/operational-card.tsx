"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type OperationalCardProps = {
  body: React.ReactNode;
  actions?: React.ReactNode;
  onOpen?: () => void;
  openLabel?: string;
  className?: string;
  bodyClassName?: string;
  bodyHover?: boolean;
  actionsClassName?: string;
};

export function OperationalActionRow({ children }: React.PropsWithChildren) {
  return (
    <div className="flex w-full flex-wrap items-center gap-3 [&_button]:h-10 [&_button]:w-10 sm:gap-2 sm:[&_button]:h-9 sm:[&_button]:w-auto">
      {React.Children.map(children, (child) => {
        if (child == null) return null;
        const childProps = React.isValidElement(child) ? child.props as { "data-mobile-target"?: string } : undefined;
        const hasTouchTarget = childProps?.["data-mobile-target"] === "44";
        return <div className={`grid ${hasTouchTarget ? "w-11" : "w-10"} sm:block sm:w-auto`}>{child}</div>;
      })}
    </div>
  );
}

export function OperationalCard({ body, actions, onOpen, openLabel, className, bodyClassName, bodyHover = true, actionsClassName }: OperationalCardProps) {
  const contentClassName = cn("w-full rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]", bodyClassName);

  return (
    <div className={cn("rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]", className)}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className={cn(contentClassName, "active-press-subtle cursor-pointer", bodyHover && "hover:bg-[var(--color-surface-muted)]")}
        >
          {body}
        </button>
      ) : (
        <div className={contentClassName}>{body}</div>
      )}
      {actions != null ? <div className={cn(actionsClassName == null && "mt-4", actionsClassName)}>{actions}</div> : null}
    </div>
  );
}
