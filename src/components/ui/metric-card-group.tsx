import * as React from "react";
import { Inbox } from "lucide-react";
import { clsx } from "clsx";
import { Card } from "./card";
import { Skeleton } from "./skeleton";

export interface MetricCardGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Target column count on large screens. Mobile is always 1 column. */
  columns?: 2 | 3 | 4;
  /** Render skeleton cards instead of children. */
  loading?: boolean;
  /** Number of skeleton cards while loading (defaults to `columns`). */
  loadingCount?: number;
  /** Render a full-width empty state instead of children. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: React.ReactNode;
}

const columnClasses: Record<NonNullable<MetricCardGroupProps["columns"]>, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function MetricCardGroup({
  columns = 4,
  loading = false,
  loadingCount,
  empty = false,
  emptyTitle = "Sin datos",
  emptyDescription,
  children,
  className,
  ...props
}: MetricCardGroupProps) {
  const gridClasses = clsx(
    "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2",
    columnClasses[columns],
  );

  if (empty) {
    return (
      <div className={clsx(gridClasses, className)} {...props}>
        <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center sm:col-span-full shadow-[var(--shadow-xs)]">
          <Inbox className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
          <p className="text-sm font-medium text-[var(--color-text-main)]">{emptyTitle}</p>
          {emptyDescription ? (
            <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{emptyDescription}</p>
          ) : null}
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={clsx(gridClasses, className)}
        role="status"
        aria-label="Cargando métricas"
        {...props}
      >
        {Array.from({ length: loadingCount ?? columns }).map((_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton circle className="h-8 w-8" />
            </div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx(gridClasses, className)} {...props}>
      {children}
    </div>
  );
}
