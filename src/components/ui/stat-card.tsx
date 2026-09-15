import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "./card";

export type StatIconVariant =
  | "neutral"
  | "primary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "violet";

export type StatNumericRole = "count" | "currency";

export interface StatTrend {
  direction: "up" | "down" | "flat";
  /** Human-readable trend text, e.g. "+12% vs. semana anterior". Never color-only. */
  label: string;
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  iconVariant?: StatIconVariant;
  trend?: StatTrend;
  numericRole?: StatNumericRole;
  /** Extra classes for the value element; also overrides the default value color. */
  valueClassName?: string;
  /** Right-aligned trailing content on the value row (e.g. a "Ver más" CTA). */
  action?: React.ReactNode;
}

const iconVariantClasses: Record<StatIconVariant, string> = {
  neutral: "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]",
  primary: "bg-[var(--color-blue-tint)] text-[var(--color-primary)]",
  success: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-fg)]",
  info: "bg-[var(--color-status-info-bg)] text-[var(--color-status-info-fg)]",
  warning: "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-fg)]",
  danger: "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-fg)]",
  violet: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const numericRoleClasses: Record<StatNumericRole, string> = {
  count: "font-mono text-2xl tabular-nums",
  currency: "min-w-0 font-mono text-xl leading-tight tabular-nums sm:text-2xl",
};

const trendIcons: Record<StatTrend["direction"], React.ElementType> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const trendClasses: Record<StatTrend["direction"], string> = {
  up: "text-[var(--color-status-success-fg)]",
  down: "text-[var(--color-status-danger-fg)]",
  flat: "text-[var(--color-text-muted)]",
};

export function StatCard({
  label,
  value,
  description,
  icon,
  iconVariant = "neutral",
  trend,
  numericRole,
  valueClassName,
  action,
  className,
  ...props
}: StatCardProps) {
  const valueClasses = clsx(
    "font-bold",
    numericRole ? numericRoleClasses[numericRole] : "text-2xl",
    valueClassName ?? "text-[var(--color-text-main)]",
  );

  const TrendIcon = trend ? trendIcons[trend.direction] : null;

  return (
    <Card className={clsx("min-w-0 p-4", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 break-words text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
        {icon ? (
          <div
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              iconVariantClasses[iconVariant],
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex min-w-0 items-baseline justify-between gap-2">
        <span className={clsx("min-w-0 flex-1 break-words", valueClasses)} data-numeric-role={numericRole}>
          {value}
        </span>
        {action ? <span className="shrink-0">{action}</span> : null}
      </div>

      {trend && TrendIcon ? (
        <p
          className={clsx(
            "mt-1.5 inline-flex items-center gap-1 text-xs font-medium",
            trendClasses[trend.direction],
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{trend.label}</span>
        </p>
      ) : null}

      {description ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      ) : null}
    </Card>
  );
}
