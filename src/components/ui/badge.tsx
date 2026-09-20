"use client";

import { clsx } from "clsx";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--color-bg-soft)] text-[var(--color-text-muted-fg)] border-[var(--color-border-light)]",
  success:
    "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-fg)] border-[var(--color-status-success-border)]",
  warning:
    "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-fg)] border-[var(--color-status-warning-border)]",
  danger:
    "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-fg)] border-[var(--color-status-danger-border)]",
  info: "bg-[var(--color-status-info-bg)] text-[var(--color-status-info-fg)] border-[var(--color-status-info-border)]",
};

const dotBgClasses: Record<BadgeVariant, string> = {
  default: "bg-current",
  success: "bg-[var(--color-status-success)]",
  warning: "bg-[var(--color-status-warning)]",
  danger: "bg-[var(--color-status-danger)]",
  info: "bg-[var(--color-status-info)]",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-[var(--space-xs)] rounded-[var(--radius-full)] border px-[var(--space-sm)] py-[var(--space-xs)] text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", dotBgClasses[variant])} />
      {children}
    </span>
  );
}
