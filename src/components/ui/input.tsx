"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, onWheel, onWheelCapture, ...props }, ref) => {
    function handleWheelCapture(event: React.WheelEvent<HTMLInputElement>) {
      onWheelCapture?.(event);

      if (event.currentTarget.type === "number") {
        event.currentTarget.blur();
      }
    }

    return (
      <input
        ref={ref}
        className={cn(
          "flex h-[var(--tap-min-height)] w-full rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-[var(--space-sm)] py-[var(--space-sm)] text-base text-[var(--color-text-main)] shadow-[var(--shadow-control)] transition-[border-color,box-shadow,background-color] duration-[var(--motion-fast)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onWheel={onWheel}
        onWheelCapture={handleWheelCapture}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
