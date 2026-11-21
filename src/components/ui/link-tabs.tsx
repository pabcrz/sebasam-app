import Link from "next/link";
import { cn } from "@/lib/utils";

export type LinkTabItem = {
  href: string;
  label: string;
  /** Shown after the label; omitted when undefined. */
  count?: number;
  current?: boolean;
};

export type LinkTabsProps = {
  label: string;
  items: LinkTabItem[];
  className?: string;
};

/**
 * Section tabs that navigate: pills inside a soft container, the current one tonal.
 * Same look as SegmentedControl; filtering stays there.
 */
export function LinkTabs({ label, items, className }: LinkTabsProps) {
  return (
    <nav
      aria-label={label}
      className={cn("no-scrollbar inline-flex max-w-full overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--color-bg-soft)]", className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "relative inline-flex h-[var(--control-md)] shrink-0 items-center gap-1.5 self-stretch rounded-[var(--radius-md)] px-3 text-sm font-medium transition-[background-color,color] duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]",
            item.current
              ? "bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)] hover:bg-[var(--color-tonal-bg-hover)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]",
          )}
        >
          {item.label}
          {item.count != null ? <span className="tabular-nums">{item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
