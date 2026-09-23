"use client";

import * as React from "react";
import { clsx } from "clsx";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={clsx("w-full caption-bottom text-left text-sm", className)}
          {...props}
        />
      </div>
    );
  },
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return <thead ref={ref} className={clsx("border-b border-[var(--color-border-subtle)]", className)} {...props} />;
});
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return <tbody ref={ref} className={clsx("divide-y divide-[var(--color-border-subtle)]", className)} {...props} />;
});
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={clsx(
          "transition-colors duration-[var(--motion-fast)] hover:bg-[var(--color-bg-soft)] data-[state=selected]:bg-[var(--color-bg-soft)]",
          className,
        )}
        {...props}
      />
    );
  },
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={clsx(
          "h-12 px-4 py-3 align-middle font-medium text-[var(--color-text-muted)]",
          className,
        )}
        {...props}
      />
    );
  },
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return <td ref={ref} className={clsx("px-4 py-3 align-top", className)} {...props} />;
  },
);
TableCell.displayName = "TableCell";
