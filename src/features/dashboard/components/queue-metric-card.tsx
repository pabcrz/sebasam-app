import Link from "next/link";
import { clsx } from "clsx";

import { Icon, type IconName } from "@/components/ui/icon";

export type QueueAccent = "primary" | "warning" | "success" | "danger" | "info";

export interface QueueMetricCardProps {
  label: string;
  value: number;
  href: string;
  icon: IconName;
  accent?: QueueAccent;
  className?: string;
}

const accentBorderClasses: Record<QueueAccent, string> = {
  primary: "border-l-[var(--color-primary)]",
  warning: "border-l-[var(--color-warning)]",
  success: "border-l-[var(--color-status-success)]",
  danger: "border-l-[var(--color-status-danger)]",
  info: "border-l-[var(--color-status-info)]",
};

/**
 * Compact navigable snapshot card for an operational queue.
 * Displays label, icon, and numeric value. The entire card is a link.
 */
export function QueueMetricCard({
  label,
  value,
  href,
  icon,
  accent = "primary",
  className,
}: QueueMetricCardProps) {
  return (
    <Link
      href={href}
      title={`${label} · ${value}`}
      aria-label={`${label} · ${value}`}
      className={clsx(
        "group flex min-w-0 flex-col justify-between rounded-[var(--radius-md)] border border-[var(--color-border-light)] border-l-4 bg-[var(--color-surface)] p-3 shadow-xs transition-all hover:shadow-md active-press-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] sm:p-4",
        accentBorderClasses[accent],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)] break-words leading-tight">
          {label}
        </span>
        <div
          className={clsx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            accent === "warning"
              ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
              : "bg-[var(--color-blue-tint)] text-[var(--color-primary)]",
          )}
        >
          <Icon name={icon} className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          data-numeric-role="count"
          className="font-mono text-2xl font-bold tabular-nums text-[var(--color-text-main)]"
        >
          {value}
        </span>
      </div>
    </Link>
  );
}