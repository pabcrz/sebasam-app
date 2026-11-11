"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "tonal" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  loading?: boolean;
}

export const buttonVariants = cva(
  "relative inline-flex max-w-full min-w-0 cursor-pointer items-center justify-center gap-[var(--space-sm)] whitespace-nowrap rounded-[var(--radius-md)] font-medium before:absolute before:left-1/2 before:top-1/2 before:h-[max(100%,var(--tap-min-height))] before:w-[max(100%,var(--tap-min-height))] before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-fast)] active-press-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-btn-primary)] text-[var(--color-on-btn-primary)] shadow-[var(--shadow-action)] hover:bg-[var(--color-btn-primary-hover)]",
        tonal:
          "bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)] hover:bg-[var(--color-tonal-bg-hover)]",
        secondary:
          "bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)] hover:bg-[var(--color-tonal-bg-hover)]",
        outline:
          "border border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]",
        ghost: "text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)]",
        danger:
          "border border-[var(--color-status-danger-border)] bg-transparent text-[var(--color-status-danger-fg)] hover:bg-[var(--color-status-danger-bg)]",
      } satisfies Record<ButtonVariant, string>,
      size: {
        default: "h-[var(--control-md)] px-[var(--space-md)] text-sm",
        sm: "h-[var(--control-sm)] px-[var(--space-sm)] text-sm",
        lg: "h-[var(--control-lg)] px-[var(--space-lg)] text-base",
        icon: "h-[var(--control-md)] w-[var(--control-md)] px-0",
      } satisfies Record<ButtonSize, string>,
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

/** Wraps runs of plain text so long labels end in "…" inside the button. */
function truncateText(children: React.ReactNode) {
  const nodes: React.ReactNode[] = [];
  let run = "";
  let runKey = 0;
  const flush = () => {
    if (run) nodes.push(<span key={`text-${runKey++}`} className="truncate">{run}</span>);
    run = "";
  };

  React.Children.toArray(children).forEach((child) => {
    if (typeof child === "string" || typeof child === "number") {
      run += child;
      return;
    }
    flush();
    nodes.push(child);
  });
  flush();

  return nodes;
}

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
    const classes = cn(buttonVariants({ variant, size }), className);

    if (asChild) {
      return (
        <Slot.Root
          data-slot="button"
          className={classes}
          ref={ref}
          aria-disabled={disabled || loading || undefined}
          {...props}
        >
          {children}
        </Slot.Root>
      );
    }

    return (
      <button
        data-slot="button"
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        type={type}
        {...props}
      >
        {loading ? (
          <>
            <Spinner className="h-4 w-4" />
            <span className="sr-only">Cargando</span>
          </>
        ) : null}
        {truncateText(children)}
      </button>
    );
  },
);
Button.displayName = "Button";
