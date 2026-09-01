import Link from "next/link";
import * as React from "react";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { StatCard } from "@/components/ui/stat-card";

export type QueueAccent = "primary" | "warning" | "success" | "danger" | "info";

export interface QueueMetricCardProps {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: React.ElementType;
  accent?: QueueAccent;
  /** Text for the trailing "see more" link inside the card, e.g. "Ver cotizaciones". */
  ctaLabel: string;
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
 * Navigable snapshot card for an operational queue. Composes the shared
 * `StatCard` contract (label/value/description/icon) with queue-specific
 * chrome: a colored left accent border and a trailing CTA that links to the
 * queue's management screen. The whole card acts as a single link.
 */
export function QueueMetricCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  accent = "primary",
  ctaLabel,
  className,
}: QueueMetricCardProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "group block min-w-0 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
        className,
      )}
    >
      <StatCard
        label={label}
        value={value}
        description={description}
        numericRole="count"
        icon={<Icon className="h-4 w-4" aria-hidden="true" />}
        action={
          <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">
            {ctaLabel}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        }
        className={clsx(
          "h-full border-l-4 transition-shadow group-hover:shadow-md",
          accentBorderClasses[accent],
        )}
      />
    </Link>
  );
}