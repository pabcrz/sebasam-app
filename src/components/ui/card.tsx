"use client";

import * as React from "react";
import { clsx } from "clsx";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          "w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-[var(--space-md)] shadow-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={clsx("mb-4 space-y-1", className)} {...props} />;
  },
);
CardHeader.displayName = "CardHeader";

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3";
};

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Tag = "h3", className, ...props }, ref) => {
    return (
        <Tag
        ref={ref}
        className={clsx("text-lg font-semibold leading-tight text-[var(--color-text-main)]", className)}
        {...props}
      />
    );
  },
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p ref={ref} className={clsx("text-sm text-[var(--color-text-muted)]", className)} {...props} />
    );
  },
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={clsx("space-y-4", className)} {...props} />;
  },
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={clsx("mt-4 flex items-center gap-3", className)} {...props} />;
  },
);
CardFooter.displayName = "CardFooter";
