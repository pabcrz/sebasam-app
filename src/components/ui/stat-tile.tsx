import * as React from "react";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

export type StatTileTone = "neutral" | "warning" | "danger" | "success";

const toneClassNames: Record<StatTileTone, { surface: string; value: string }> = {
  neutral: { surface: "bg-[var(--color-bg-soft)]", value: "text-[var(--color-text-main)]" },
  warning: { surface: "bg-[var(--color-status-warning-bg)]", value: "text-[var(--color-status-warning-fg)]" },
  danger: { surface: "bg-[var(--color-status-danger-bg)]", value: "text-[var(--color-status-danger-fg)]" },
  success: { surface: "bg-[var(--color-status-success-bg)]", value: "text-[var(--color-status-success-fg)]" },
};

export interface StatTileProps {
  /** Short label; the longer meaning goes in `info`. */
  label: string;
  value: React.ReactNode;
  /** Explanation shown behind the ⓘ next to the label. */
  info?: React.ReactNode;
  tone?: StatTileTone;
  className?: string;
}

/** Key figure on a tinted surface. Tone colors the figure and its background, never a border. */
export function StatTile({ label, value, info, tone = "neutral", className }: StatTileProps) {
  const classes = toneClassNames[tone];

  return (
    <div className={cn("grid min-w-0 gap-1 rounded-[var(--radius-lg)] p-4", classes.surface, className)}>
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
        <span className="min-w-0 truncate">{label}</span>
        {info ? <InfoTip label={`Qué incluye: ${label}`}>{info}</InfoTip> : null}
      </div>
      <p className={cn("min-w-0 truncate text-xl font-semibold tabular-nums sm:text-2xl", classes.value)}>{value}</p>
    </div>
  );
}
