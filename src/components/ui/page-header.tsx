"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { OperationalActionsMenu } from "./operational-actions-menu";

export interface PageHeaderProps {
  title: string;
  /** Badge or short state beside the title. Do not repeat visible counters here. */
  status?: React.ReactNode;
  /** Icon buttons for secondary actions. */
  secondaryActions?: React.ReactNode;
  /** Actions that go into the ⋯ menu. Rendered after the icon buttons. */
  overflow?: React.ReactNode;
  /** The one primary action of the page. Always rendered last, on the right. */
  primaryAction?: React.ReactNode;
  className?: string;
}

/** Page title on the left; actions on the right with the primary last. */
export function PageHeader({ title, status, secondaryActions, overflow, primaryAction, className }: PageHeaderProps) {
  const hasActions = Boolean(secondaryActions || overflow || primaryAction);

  return (
    <header
      data-testid="page-header"
      className={cn("flex min-w-0 flex-wrap items-center justify-between gap-3", className)}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 truncate text-xl font-semibold text-[var(--color-text-main)]">{title}</h1>
        {status}
      </div>
      {hasActions ? (
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          {secondaryActions}
          {overflow ? (
            <OperationalActionsMenu
              triggerIconOnly
              triggerAriaLabel="Más acciones de la página"
              title="Más acciones"
              triggerClassName="min-h-11 min-w-11 px-0"
            >
              {overflow}
            </OperationalActionsMenu>
          ) : null}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
