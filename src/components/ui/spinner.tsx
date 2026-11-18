"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-block animate-spin rounded-full border-current border-t-transparent",
          sizeClasses[size],
          className,
        )}
        role="status"
        aria-label="Cargando"
        {...props}
      />
    );
  },
);
Spinner.displayName = "Spinner";
