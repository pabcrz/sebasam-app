"use client";

import * as React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";

type QuoteBuilderDialogShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  pending?: boolean;
  dirty?: boolean;
  onDiscard?: () => void;
  trigger?: React.ReactNode;
  header?: React.ReactNode;
  stepper?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel?: string;
  discardTitle?: React.ReactNode;
  discardDescription?: React.ReactNode;
  discardConfirmLabel?: string;
  discardCancelLabel?: string;
};

/** Quote-builder-only modal chrome with compact desktop spacing. */
export function QuoteBuilderDialogShell({
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
}: QuoteBuilderDialogShellProps) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);
  const closeRequestFocusRef = React.useRef<HTMLElement | null>(null);
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setConfirmDiscardOpen(false);
  }

  const requestClose = React.useCallback(() => {
    if (pending) return;
    if (dirty) {
      closeRequestFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }, [dirty, onOpenChange, pending]);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestClose();
  }, [onOpenChange, requestClose]);

  const handleConfirmDiscardOpenChange = React.useCallback((nextOpen: boolean) => {
    setConfirmDiscardOpen(nextOpen);
    if (!nextOpen) window.requestAnimationFrame(() => closeRequestFocusRef.current?.focus());
  }, []);

  const handleDiscard = React.useCallback(() => {
    setConfirmDiscardOpen(false);
    onDiscard?.();
    onOpenChange(false);
  }, [onDiscard, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={clsx(
          "!inset-0 !h-dvh !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !gap-0 p-3 sm:!bottom-auto sm:!left-1/2 sm:!right-auto sm:!top-1/2 sm:!h-dvh sm:!max-h-none sm:!w-[min(92vw,64rem)] sm:!max-w-5xl sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-[var(--radius-lg)] sm:!p-3",
        )}
        style={{ alignItems: "stretch", display: "flex", flexDirection: "column", justifyContent: "flex-start", overflow: "hidden" }}
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}
        onInteractOutside={(event) => { if (pending) event.preventDefault(); }}
      >
        <div className="relative shrink-0" style={{ flexShrink: 0 }} data-testid="multi-step-dialog-header">
          <DialogHeader className="pr-12 sm:pr-14">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
            {header}
          </DialogHeader>
          <button type="button" onClick={requestClose} disabled={pending} aria-label={closeLabel} className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-50">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {stepper != null ? <div className="shrink-0 border-b border-[var(--color-border-light)] p-2 sm:p-2" style={{ flexShrink: 0 }} data-testid="multi-step-dialog-stepper">{stepper}</div> : null}
        <section className="py-2" style={{ flex: "1 1 0%", minHeight: 0, minWidth: 0, overflowY: "auto", overscrollBehaviorY: "contain" }} data-testid="multi-step-dialog-body">
          {body}
        </section>
        {footer != null ? <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] bg-[var(--color-surface)] pt-2 sm:pt-4" style={{ flexShrink: 0, minWidth: 0 }} data-testid="multi-step-dialog-footer">{footer}</div> : null}
      </DialogContent>
      <ConfirmDialog open={confirmDiscardOpen} onOpenChange={handleConfirmDiscardOpenChange} title={discardTitle} description={discardDescription} confirmLabel={discardConfirmLabel} cancelLabel={discardCancelLabel} variant="danger" onConfirm={handleDiscard} />
    </Dialog>
  );
}
