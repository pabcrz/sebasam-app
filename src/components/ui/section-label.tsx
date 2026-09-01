import type * as React from "react";
import { clsx } from "clsx";

type SectionLabelElement = "h2" | "h3" | "legend" | "p";

export type SectionLabelProps = React.HTMLAttributes<HTMLElement> & {
  as?: SectionLabelElement;
};

export function SectionLabel({ as: Tag = "h2", className, ...props }: SectionLabelProps) {
  return (
    <Tag
      className={clsx(
        "text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]",
        className,
      )}
      {...props}
    />
  );
}
