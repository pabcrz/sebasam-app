"use client";

import * as React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { ConfirmDialog } from "./confirm-dialog";

export interface MultiStepDialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the dialog requests to open or close. */
  onOpenChange: (open: boolean) => void;
  /** Title rendered in the fixed header. */
  title: React.ReactNode;
  /** Optional description rendered under the title. */
  description?: React.ReactNode;
  /**
   * Blocks dismissal while an operation is pending: Escape, backdrop press,
   * and the close button are all locked. No discard confirmation is opened
   * while pending, even when `dirty` is set.
   */
  pending?: boolean;
  /** Marks the flow as dirty; a close request asks for discard confirmation. */
  dirty?: boolean;
  /** Called after the user confirms discarding unsaved changes. */
  onDiscard?: () => void;
  /** Optional trigger rendered inside the dialog root. */
  trigger?: React.ReactNode;
  /** Extra content rendered in the fixed header, under the title. */
  header?: React.ReactNode;
  /** Fixed stepper/navigation region rendered between header and body. */
  stepper?: React.ReactNode;
  /** Scrollable body region. */
  body: React.ReactNode;
  /** Fixed footer rendered outside the scrollable body. */
  footer?: React.ReactNode;
  /** Aria-label for the close button. */
  closeLabel?: string;
  /** Title of the discard confirmation dialog. */
  discardTitle?: React.ReactNode;
  /** Description of the discard confirmation dialog. */
  discardDescription?: React.ReactNode;
  /** Label of the confirm button in the discard confirmation dialog. */
  discardConfirmLabel?: string;
  /** Label of the cancel button in the discard confirmation dialog. */
  discardCancelLabel?: string;
  /** Extra classes for the dialog content (defaults to fullscreen mobile / centered desktop). */
  className?: string;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: CustomEvent) => void;
  onInteractOutside?: (event: CustomEvent) => void;
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Canonical wizard shell: fixed header/stepper/footer with a scrollable body,
 * fullscreen on mobile and centered on desktop. Dismissal follows a single
 * contract: `pending` locks every close path, and a dirty flow confirms
 * discarding unsaved changes before closing.
 */
export function MultiStepDialog({
  open,
  onOpenChange,
  title,
  description,
  pending = false,
  dirty = false,
  onDiscard,
  trigger,
  header,
  stepper,
  body,
  footer,
  closeLabel = "Cerrar",
  discardTitle = "¿Descartar los cambios?",
  discardDescription = "Se perderá el progreso no guardado.",
  discardConfirmLabel = "Descartar cambios",
  discardCancelLabel = "Seguir editando",
  className,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  onCloseAutoFocus,
}: MultiStepDialogProps) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);
  const closeRequestFocusRef = React.useRef<HTMLElement | null>(null);

  // Reset the discard confirmation when the dialog closes, including when the
  // parent forces it closed. Track the previous open value and adjust state
  // during render (the sanctioned "store information from previous renders"
  // pattern) instead of calling setState synchronously inside an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setConfirmDiscardOpen(false);
  }

  const requestClose = React.useCallback(() => {
    if (pending) return;
    if (dirty) {
      closeRequestFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }, [dirty, onOpenChange, pending]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }
      requestClose();
    },
    [onOpenChange, requestClose],
  );

  const handleConfirmDiscardOpenChange = React.useCallback((nextOpen: boolean) => {
    setConfirmDiscardOpen(nextOpen);
    if (!nextOpen) {
      window.requestAnimationFrame(() => closeRequestFocusRef.current?.focus());
    }
  }, []);

  const handleDiscard = React.useCallback(() => {
    setConfirmDiscardOpen(false);
    onDiscard?.();
    onOpenChange(false);
  }, [onDiscard, onOpenChange]);

  const handleEscapeKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (pending) event.preventDefault();
      onEscapeKeyDown?.(event);
    },
    [onEscapeKeyDown, pending],
  );

  const handlePointerDownOutside = React.useCallback(
    (event: CustomEvent) => {
      if (pending) event.preventDefault();
      onPointerDownOutside?.(event);
    },
    [onPointerDownOutside, pending],
  );

  const handleInteractOutside = React.useCallback(
    (event: CustomEvent) => {
      if (pending) event.preventDefault();
      onInteractOutside?.(event);
    },
    [onInteractOutside, pending],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={clsx(
          "!inset-0 !h-dvh !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none p-4 sm:!bottom-auto sm:!left-1/2 sm:!right-auto sm:!top-1/2 sm:!h-[min(90dvh,52rem)] sm:!max-h-[min(90dvh,52rem)] sm:!w-[min(92vw,64rem)] sm:!max-w-5xl sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-[var(--radius-lg)] sm:p-6",
          className,
        )}
        style={{
          alignItems: "stretch",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          overflow: "hidden",
        }}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <div
          className="relative shrink-0"
          style={{ flexShrink: 0 }}
          data-testid="multi-step-dialog-header"
        >
          <DialogHeader className="pr-12 sm:pr-14">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
            {header}
          </DialogHeader>
          <button
            type="button"
            onClick={requestClose}
            disabled={pending}
            aria-label={closeLabel}
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {stepper != null ? (
          <div
            className="shrink-0 border-b border-[var(--color-border-light)] pb-4"
            style={{ flexShrink: 0 }}
            data-testid="multi-step-dialog-stepper"
          >
            {stepper}
          </div>
        ) : null}
        <div
          className="min-h-0 py-4 pr-1"
          style={{ flex: "1 1 0%", minHeight: 0, overflowY: "auto", overscrollBehaviorY: "contain" }}
          data-testid="multi-step-dialog-body"
        >
          {body}
        </div>
        {footer != null ? (
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] bg-[var(--color-surface)] pt-4"
            style={{ flexShrink: 0 }}
            data-testid="multi-step-dialog-footer"
          >
            {footer}
          </div>
        ) : null}
      </DialogContent>
      <ConfirmDialog
        open={confirmDiscardOpen}
        onOpenChange={handleConfirmDiscardOpenChange}
        title={discardTitle}
        description={discardDescription}
        confirmLabel={discardConfirmLabel}
        cancelLabel={discardCancelLabel}
        variant="danger"
        onConfirm={handleDiscard}
      />
    </Dialog>
  );
}