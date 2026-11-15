"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";

export type EntityCardProps = {
  /** Accessible name of the card; also announced when the card is focused. */
  openLabel: string;
  title: React.ReactNode;
  folio?: React.ReactNode;
  /** Status badge slot, shown next to the folio. */
  status?: React.ReactNode;
  amount?: React.ReactNode;
  customer?: React.ReactNode;
  /** Already-resolved unit identity (see formatUnitIdentity). Hidden when empty. */
  unit?: string | null;
  /** Driver name, always on its own line. Hidden when empty. */
  driver?: string | null;
  keyData?: React.ReactNode;
  /** Footer tools, rendered in this fixed order: Editar · Imprimir · Compartir · ⋯. */
  editAction?: React.ReactNode;
  printAction?: React.ReactNode;
  shareAction?: React.ReactNode;
  overflowAction?: React.ReactNode;
  /** State action on the right of the footer; pass a `tonal` Button. */
  stateAction?: React.ReactNode;
  /** Opens the preview when the card body (not a button or link) is activated. */
  onOpen?: () => void;
  selected?: boolean;
  variant?: "default" | "featured";
  className?: string;
};

const interactiveSelector = "button, a, input, select, textarea, label, [role=menu], [role=menuitem], [role=dialog]";

/**
 * Operational card for quotes, work orders and notes. Shadow only (no border),
 * with a single footer row: tools on the left and the state action on the right.
 */
export function EntityCard({
  openLabel,
  title,
  folio,
  status,
  amount,
  customer,
  unit,
  driver,
  keyData,
  editAction,
  printAction,
  shareAction,
  overflowAction,
  stateAction,
  onOpen,
  selected = false,
  variant = "default",
  className,
}: EntityCardProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    if (!event.currentTarget.contains(target)) return;
    const interactive = target.closest(interactiveSelector);
    if (interactive && event.currentTarget.contains(interactive)) return;
    onOpen?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen?.();
  };

  return (
    <div
      role="group"
      aria-label={openLabel}
      tabIndex={0}
      data-variant={variant}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex w-full min-w-0 cursor-pointer flex-col rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 text-left shadow-[var(--shadow-card)] transition-shadow duration-[var(--motion-fast)] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2",
        variant === "featured" && "bg-[var(--color-blue-tint)] shadow-[var(--shadow-card-hover)]",
        selected && "border-2 border-[color-mix(in_srgb,var(--color-amount)_55%,transparent)] p-[14px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3
            title={typeof title === "string" ? title : undefined}
            className={cn(
              "line-clamp-2 min-h-12 text-lg font-semibold leading-6 text-[var(--color-text-main)]",
              selected && "text-[var(--color-amount)]",
            )}
          >
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            {folio != null ? (
              <span className={cn(selected && "text-[var(--color-amount)]")}>{folio}</span>
            ) : null}
            {status}
          </div>
        </div>
        {amount != null ? (
          <p className="shrink-0 text-2xl font-extrabold tabular-nums text-[var(--color-amount)]">{amount}</p>
        ) : null}
      </div>

      {customer != null ? (
        <p className="mt-3 truncate text-sm font-medium text-[var(--color-text-main)]">{customer}</p>
      ) : null}
      {unit ? (
        <p data-testid="entity-card-unit" className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Icon name="unit" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{unit}</span>
        </p>
      ) : null}
      {driver ? (
        <p data-testid="entity-card-driver" className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Icon name="driver" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{driver}</span>
        </p>
      ) : null}

      {keyData != null ? (
        <div className="mt-3 text-xs text-[var(--color-text-muted)]">{keyData}</div>
      ) : null}

      <div data-testid="entity-card-footer" className="mt-auto flex flex-nowrap items-center justify-between gap-2 pt-4">
        {[editAction, printAction, shareAction, overflowAction].some((node) => node != null) ? (
          <div data-testid="entity-card-tools" className="flex shrink-0 items-center gap-2">
            {editAction}
            {printAction}
            {shareAction}
            {overflowAction}
          </div>
        ) : null}
        {stateAction != null ? (
          <div data-testid="entity-card-state" className="flex min-w-0 flex-1 justify-end">
            {stateAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}
