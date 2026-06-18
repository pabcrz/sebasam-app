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
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(30,77,140,0.18)] disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm",
  secondary: "bg-[var(--color-blue-tint)] text-[var(--color-navy-900)] hover:bg-[#d9e7f7]",
  outline:
    "border border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-navy-900)] hover:bg-[var(--color-bg-soft)]",
  ghost: "text-[var(--color-navy-900)] hover:bg-[var(--color-bg-soft)]",
  danger: "bg-[var(--color-status-danger)] text-white hover:bg-[#dc2626] shadow-sm",
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
