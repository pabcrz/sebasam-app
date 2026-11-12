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
 * Section tabs that navigate: underlined like Tabs, with the current one in bold
 * under the brand gradient. Filtering stays with SegmentedControl.
 */
export function LinkTabs({ label, items, className }: LinkTabsProps) {
  return (
    <nav
      aria-label={label}
      className={cn("no-scrollbar flex min-w-0 max-w-full overflow-x-auto border-b border-[var(--color-border-light)]", className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "relative inline-flex min-h-[var(--tap-min-height)] shrink-0 items-center gap-1.5 px-3 text-sm transition-colors duration-[var(--motion-fast)] after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:content-[''] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]",
            item.current
              ? "font-semibold text-[var(--color-text-main)] after:bg-[image:var(--gradient-primary)]"
              : "font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]",
          )}
        >
          {item.label}
          {item.count != null ? <span className="tabular-nums">{item.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
