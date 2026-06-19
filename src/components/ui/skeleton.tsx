"use client";

import { clsx } from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
}

export function Skeleton({ className, circle, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-[var(--color-border-light)]/60",
        circle ? "rounded-full" : "rounded-md",
        className,
      )}
      {...props}
    />
  );
}
