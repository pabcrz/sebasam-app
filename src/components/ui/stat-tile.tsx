import * as React from "react";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

export type StatTileTone = "neutral" | "warning" | "danger" | "success";

/** Only the figure takes the tone; the tile itself stays white with a 1px border. */
const toneValueClassNames: Record<StatTileTone, string> = {
  neutral: "text-[var(--color-text-main)]",
  warning: "text-[var(--color-status-warning-fg)]",
  danger: "text-[var(--color-status-danger-fg)]",
  success: "text-[var(--color-status-success-fg)]",
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

/** Key figure on a white bordered surface. Tone colors only the figure; no shadow, no tinted background. */
export function StatTile({ label, value, info, tone = "neutral", className }: StatTileProps) {
  return (
    <div className={cn("grid min-w-0 gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4", className)}>
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
        <span className="min-w-0 truncate">{label}</span>
        {info ? <InfoTip label={`Qué incluye: ${label}`}>{info}</InfoTip> : null}
      </div>
      <p className={cn("min-w-0 truncate text-xl font-semibold tabular-nums sm:text-2xl", toneValueClassNames[tone])}>{value}</p>
    </div>
  );
}
