"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type OperationalCardLayoutProps = {
  header: React.ReactNode;
  identity: React.ReactNode;
  context?: React.ReactNode;
  dates?: React.ReactNode;
  className?: string;
};

export function OperationalCardLayout({
  header,
  identity,
  context,
  dates,
  className,
}: OperationalCardLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-3 text-left", className)}>
      <div data-testid="card-header">{header}</div>
      <div data-testid="card-identity">{identity}</div>
      {context ? <div data-testid="card-context">{context}</div> : null}
      {dates ? (
        <div
          data-testid="card-dates"
          className="border-t border-[var(--color-border-subtle)] pt-3 text-xs text-[var(--color-text-muted)]"
        >
          {dates}
        </div>
      ) : null}
    </div>
  );
}

export type OperationalCardActionsProps = {
  primary?: React.ReactNode;
  frequent?: React.ReactNode;
  overflow?: React.ReactNode;
  className?: string;
  actionGapClassName?: string;
};

export function OperationalCardActions({
  primary,
  frequent,
  overflow,
  className,
  actionGapClassName = "gap-2",
}: OperationalCardActionsProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      {primary ? (
        <div data-testid="operational-card-primary-action" className="w-full [&_a]:w-full [&_button]:w-full">
          {primary}
        </div>
      ) : null}
      {frequent || overflow ? (
        <div
          data-testid="operational-card-secondary-actions"
          className={cn("flex w-full items-center", actionGapClassName)}
        >
          {frequent ? (
            <div className={cn("flex min-w-0 flex-1 items-center [&>*]:flex-1 [&>*]:min-w-0", actionGapClassName)}>
              {frequent}
            </div>
          ) : null}
          {overflow ? (
            <div data-testid="operational-card-overflow-action" className="shrink-0">
              {overflow}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
