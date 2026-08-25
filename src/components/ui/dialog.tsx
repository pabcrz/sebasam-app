"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

type DialogPointerDownOutsideGuard = {
  registerPointerDownOutside: (event: PointerEvent) => void;
  consumePointerDownOutside: (event: Event) => boolean;
};

const DialogPointerDownOutsideContext = React.createContext<DialogPointerDownOutsideGuard | null>(null);

export function useDialogPointerDownOutsideGuard() {
  return React.useContext(DialogPointerDownOutsideContext);
}

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-dialog-overlay
      className={clsx(
        "fixed inset-0 z-50 bg-[var(--color-navy-900)]/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

function isDialogPortalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest("[data-select-content], [data-dialog-popover]") !== null;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  (
    { className, children, onInteractOutside, onPointerDownOutside, onFocusOutside, ...props },
    ref,
  ) => {
    const pointerDownOutsideEventRef = React.useRef<PointerEvent | null>(null);
    const pointerDownOutsideGuard = React.useMemo<DialogPointerDownOutsideGuard>(
      () => ({
        registerPointerDownOutside: (event) => {
          pointerDownOutsideEventRef.current = event;
        },
        consumePointerDownOutside: (event) => {
          if (pointerDownOutsideEventRef.current !== event) return false;
          pointerDownOutsideEventRef.current = null;
          return true;
        },
      }),
      [],
    );

    return (
      <DialogPointerDownOutsideContext.Provider value={pointerDownOutsideGuard}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            ref={ref}
            className={clsx(
              "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-[var(--space-md)] shadow-lg",
              className,
            )}
            onInteractOutside={(event) => {
              if (pointerDownOutsideGuard.consumePointerDownOutside(event.detail.originalEvent)) {
                event.preventDefault();
              }
              if (isDialogPortalTarget(event.target)) {
                event.preventDefault();
                return;
              }
              onInteractOutside?.(event);
            }}
            onPointerDownOutside={(event) => {
              if (isDialogPortalTarget(event.target)) {
                event.preventDefault();
                return;
              }
              onPointerDownOutside?.(event);
            }}
            onFocusOutside={(event) => {
              if (isDialogPortalTarget(event.target)) {
                event.preventDefault();
                return;
              }
              onFocusOutside?.(event);
            }}
            {...props}
          >
            {children}
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPointerDownOutsideContext.Provider>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogMobileContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  return (
    <DialogContent
      ref={ref}
      className={clsx("grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0", className)}
      {...props}
    />
  );
});
DialogMobileContent.displayName = "DialogMobileContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />;
}

export function DialogMobileHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <DialogHeader
      className={clsx(
        "relative shrink-0 border-b border-[var(--color-border-light)] px-4 py-3 pr-12 text-left sm:px-6 sm:pr-14",
        className,
      )}
      {...props}
    />
  );
}

export function DialogMobileBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6", className)} {...props} />;
}

export const DialogMobileClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, children, type = "button", ...props }, ref) => {
  return (
    <DialogClose asChild>
      <button
        ref={ref}
        type={type}
        className={clsx(
          "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children ?? <X className="h-4 w-4" aria-hidden="true" />}
      </button>
    </DialogClose>
  );
});
DialogMobileClose.displayName = "DialogMobileClose";

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={clsx("text-lg font-semibold leading-none tracking-tight text-[var(--color-text-main)]", className)}
      {...props}
    />
  );
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={clsx("text-sm text-[var(--color-text-muted)]", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = DialogPrimitive.Description.displayName;
