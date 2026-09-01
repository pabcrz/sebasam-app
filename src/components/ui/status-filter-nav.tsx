import Link from "next/link";
import { clsx } from "clsx";

export type StatusFilterNavItem = {
  href: string;
  label: string;
  current?: boolean;
};

export type StatusFilterNavProps = {
  items: StatusFilterNavItem[];
  label: string;
  className?: string;
};

export function StatusFilterNav({ items, label, className }: StatusFilterNavProps) {
  return (
    <nav aria-label={label} className={clsx("max-w-full overflow-x-auto", className)}>
      <div className="flex min-w-max gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] p-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={clsx(
              "inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
              item.current
                ? "bg-[var(--color-surface)] text-[var(--color-text-main)] shadow-xs"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-main)]",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
