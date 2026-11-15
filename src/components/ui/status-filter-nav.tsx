import { SegmentedControl } from "./segmented-control";

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
    <SegmentedControl
      label={label}
      className={className}
      options={items.map((item) => ({ value: item.href, label: item.label, href: item.href }))}
      value={items.find((item) => item.current)?.href}
    />
  );
}
