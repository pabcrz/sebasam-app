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
        "fixed inset-0 z-50 bg-[var(--color-overlay)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
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

function dispatchEscape(target: HTMLElement | null) {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  });
  if (target) {
    target.dispatchEvent(event);
  } else if (typeof document !== "undefined") {
    document.dispatchEvent(event);
  }
}

export function useDialogPlatformDismiss(
  contentRef: React.RefObject<HTMLElement | null>,
  enabled: boolean = true,
) {
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // 1. Modern CloseWatcher API (Chrome 120+, Android Chrome/WebView)
    if (
      "CloseWatcher" in window &&
      typeof (window as unknown as { CloseWatcher: new () => { onclose?: () => void; destroy: () => void } }).CloseWatcher === "function"
    ) {
      let watcher: { onclose?: () => void; destroy: () => void } | null = null;
      try {
        const CloseWatcherConstructor = (
          window as unknown as { CloseWatcher: new () => { onclose?: () => void; destroy: () => void } }
        ).CloseWatcher;
        watcher = new CloseWatcherConstructor();
        watcher.onclose = () => {
          if (watcher) {
            watcher.destroy();
            watcher = null;
          }
          dispatchEscape(contentRef.current);
        };
      } catch {
        // Fall back to history if CloseWatcher creation fails
      }

      if (watcher) {
        return () => {
          if (watcher) {
            watcher.destroy();
            watcher = null;
          }
        };
      }
    }

    // 2. History API fallback for browsers without CloseWatcher (Safari, Firefox, older browsers)
    const historyKey = `__dialog_${Math.random().toString(36).slice(2, 9)}`;
    let closedByPopState = false;
    let pushed = false;

    try {
      const currentState = (window.history.state as Record<string, unknown> | null) ?? {};
      window.history.pushState({ ...currentState, [historyKey]: true }, "");
      pushed = true;
    } catch {
      return;
    }

    const handlePopState = () => {
      closedByPopState = true;
      dispatchEscape(contentRef.current);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushed && !closedByPopState) {
        try {
          window.history.back();
        } catch {
          // Ignore history errors during unmount
        }
      }
    };
  }, [contentRef, enabled]);
}

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  disablePlatformDismiss?: boolean;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      disablePlatformDismiss = false,
      ...props
    },
    ref,
  ) => {
    const localRef = React.useRef<HTMLDivElement | null>(null);
    const setRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        localRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    useDialogPlatformDismiss(localRef, !disablePlatformDismiss);

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
            ref={setRef}
            className={clsx(
              "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] translate-x-[-50%] translate-y-[-50%] gap-[var(--space-md)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-[var(--space-lg)] shadow-[var(--shadow-dialog)]",
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
        "relative shrink-0 border-b border-[var(--color-border-subtle)] px-4 py-3 pr-12 text-left sm:px-6 sm:pr-14",
        className,
      )}
      {...props}
    />
  );
}

type DialogMobileBodyProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "default" | "none";
};

export function DialogMobileBody({ className, padding = "default", ...props }: DialogMobileBodyProps) {
  return (
    <div
      className={clsx("min-h-0 overflow-y-auto", padding === "default" ? "px-4 py-4 sm:px-6 sm:py-6" : "p-0", className)}
      {...props}
    />
  );
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
