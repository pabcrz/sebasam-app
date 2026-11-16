import * as React from "react";
import { Button } from "./button";
import { Icon } from "./icon";

export interface FilterButtonProps extends Omit<React.ComponentProps<typeof Button>, "children" | "size" | "variant"> {
  /** Number of applied filters; shown as a badge and appended to the accessible name. */
  count?: number;
  /** Accessible name without the count. */
  label?: string;
}

/** Icon-only filters trigger shared by every list header. */
export function FilterButton({ count = 0, label = "Filtros", className, ...props }: FilterButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-haspopup="dialog"
      aria-label={count > 0 ? `${label} (${count})` : label}
      title={label}
      className={`relative shrink-0 ${className ?? ""}`}
      {...props}
    >
      <Icon name="filter" className="h-5 w-5" aria-hidden="true" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[11px] font-semibold leading-none text-[var(--color-primary-foreground,#fff)]"
        >
          {count}
        </span>
      ) : null}
    </Button>
  );
}
