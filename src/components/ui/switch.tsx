"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: React.ReactNode;
}

/** Binary setting. With a label it renders as a row: label on the left, switch on the right. */
export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, id, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;

  const toggle = (
    <SwitchPrimitive.Root
      ref={ref}
      id={switchId}
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-[var(--radius-md)] bg-[var(--color-border-light)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--color-primary)]",
        !label && className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-[var(--color-surface)] transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );

  if (!label) return toggle;

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label
        htmlFor={switchId}
        className="cursor-pointer text-sm font-medium text-[var(--color-text-main)] peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
      >
        {label}
      </label>
      {toggle}
    </div>
  );
});
Switch.displayName = "Switch";
