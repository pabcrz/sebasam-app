import * as React from "react";
import { clsx } from "clsx";
import { Card } from "./card";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  description,
  icon,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={clsx("p-4", className)} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">
          {label}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-[var(--color-text-main)]">
          {value}
        </span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {description}
        </p>
      )}
    </Card>
  );
}
