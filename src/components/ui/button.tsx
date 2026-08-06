"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

const baseClasses =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[image:var(--gradient-primary)] text-white shadow-sm hover:bg-[image:var(--gradient-primary-hover)]",
  secondary:
    "bg-[var(--color-blue-tint)] text-[var(--color-text-main)] shadow-sm hover:bg-[var(--color-blue-tint-strong)] hover:text-[var(--color-text-main)] hover:shadow-md dark:hover:bg-[var(--color-navy-600)] dark:hover:text-white",
  outline:
    "border border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]",
  ghost: "text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]",
  danger: "bg-[var(--color-status-danger)] text-white hover:bg-[var(--color-status-danger-hover)] shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-[var(--tap-min-height)] px-4 py-2 text-base",
  sm: "h-9 px-3 text-sm",
  lg: "min-h-[var(--tap-min-height)] px-6 py-3 text-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      asChild = false,
      loading = false,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
          ref={ref}
          aria-disabled={disabled || loading || undefined}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        ref={ref}
        disabled={disabled || loading}
        type={asChild ? undefined : type}
        {...props}
      >
        {loading ? (
          <>
            <Spinner className="h-4 w-4" />
            <span className="sr-only">Cargando</span>
          </>
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
