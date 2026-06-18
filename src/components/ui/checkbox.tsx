"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { clsx } from "clsx";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, id, ...props }, ref) => {
  const generatedId = React.useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={clsx(
          "peer flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(30,77,140,0.18)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:bg-[var(--color-primary)]",
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="text-white">
          <CheckIcon />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? (
        <label
          htmlFor={checkboxId}
          className="cursor-pointer text-sm font-medium text-[var(--color-navy-900)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          {label}
        </label>
      ) : null}
    </div>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
