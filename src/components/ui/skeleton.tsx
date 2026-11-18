"use client";

import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  circle?: boolean;
}

export function Skeleton({ className, circle, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse animate-shimmer bg-[var(--color-border-light)]/60",
        circle ? "rounded-full" : "rounded-md",
        className,
      )}
      {...props}
    />
  );
}
