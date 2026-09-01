"use client";

import * as React from "react";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import type { ButtonSize, ButtonVariant } from "./button";

export interface DestructiveActionProps {
  // Trigger
  triggerLabel: React.ReactNode;
  triggerAriaLabel?: string;
  triggerTitle?: string;
  triggerIcon?: React.ReactNode;
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
  triggerLabelClassName?: string;
  size?: ButtonSize;
  iconOnly?: boolean;
  disabled?: boolean;
  /** Prevent the trigger click from bubbling (e.g. inside a clickable row). */
  stopPropagation?: boolean;
  // Confirmation dialog
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Optional body content rendered inside the confirmation (e.g. a reason field). */
  children?: React.ReactNode;
  /**
   * Runs the destructive action. Throw to keep the dialog open and show the
   * error; resolve to close. NEXT_REDIRECT errors are re-thrown so Next.js
   * can navigate.
   */
  onConfirm: () => Promise<void> | void;
  fallbackErrorMessage?: string;
}

/**
 * Controlled composition of a danger trigger and a `ConfirmDialog`.
 *
 * While the action is pending the trigger and both dialog actions are
 * disabled, dismissal (Escape / outside press / cancel) is blocked, and
 * closing the dialog returns focus to the trigger.
 */
export function DestructiveAction({
  triggerLabel,
  triggerAriaLabel,
  triggerTitle,
  triggerIcon,
  triggerVariant = "danger",
  triggerClassName,
  triggerLabelClassName,
  size = "default",
  iconOnly = false,
  disabled = false,
  stopPropagation = false,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  children,
  onConfirm,
  fallbackErrorMessage = "No se pudo completar la acción. Intenta de nuevo.",
}: DestructiveActionProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleConfirm = React.useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch (cause) {
        // NEXT_REDIRECT errors must be re-thrown so Next.js can navigate.
        if (cause instanceof Error && cause.message.includes("NEXT_REDIRECT")) {
          throw cause;
        }
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : fallbackErrorMessage,
        );
      }
    });
  }, [onConfirm, fallbackErrorMessage]);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={iconOnly ? "icon" : size}
        ref={triggerRef}
        className={triggerClassName}
        loading={isPending}
        disabled={disabled || isPending}
        aria-label={triggerAriaLabel}
        title={triggerTitle}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          setError(null);
          setOpen(true);
        }}
      >
        {triggerIcon}
        {triggerLabel ? (
          <span className={iconOnly ? "sr-only" : triggerLabelClassName}>
            {triggerLabel}
          </span>
        ) : null}
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isPending) setOpen(nextOpen);
        }}
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant="danger"
        loading={isPending}
        onConfirm={handleConfirm}
      >
        {error ? (
          <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">
            {error}
          </p>
        ) : null}
        {children}
      </ConfirmDialog>
    </>
  );
}