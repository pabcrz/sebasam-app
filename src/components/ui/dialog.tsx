"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

const SHEET_DESKTOP_QUERY = "(min-width: 1024px)";

function canMatchViewport() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribeToDesktopViewport(onChange: () => void) {
  if (!canMatchViewport()) return () => {};
  const query = window.matchMedia(SHEET_DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isDesktopViewport() {
  return canMatchViewport() && window.matchMedia(SHEET_DESKTOP_QUERY).matches;
}

/**
 * Root for `variant="sheet"` content. Below 1024px it is modal (focus trapped,
 * page inert, Esc and overlay dismiss). From 1024px it is non-modal, so the
 * list beside the panel stays interactive; Esc still closes and focus still
 * returns to the trigger. Use it with `DialogContent variant="sheet"`.
 */
export function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const isDesktop = React.useSyncExternalStore(subscribeToDesktopViewport, isDesktopViewport, () => false);
  return <DialogPrimitive.Root modal={!isDesktop} {...props} />;
}

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
      className={cn(
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

/**
 * `dialog` is the centered shape (default). `sheet` is one shape that changes
 * by width: a bottom sheet below 768px, a 420px right panel from 768px that is
 * dimmed up to 1023px, and an undimmed 420px panel beside the content from
 * 1024px (use it with the `Sheet` root).
 */
export type DialogVariant = "dialog" | "sheet";

const dialogShapeClassName =
  "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] overflow-y-auto rounded-[var(--radius-lg)] p-[var(--space-lg)] shadow-[var(--shadow-dialog)] gap-[var(--space-md)]";

const sheetShapeClassName =
  "inset-x-0 bottom-0 top-auto w-full max-w-none max-h-[calc(100dvh_-_var(--space-xl))] translate-x-0 translate-y-0 gap-0 rounded-t-[var(--radius-sheet)] rounded-b-none p-0 shadow-[var(--shadow-md)] md:inset-y-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-dvh md:max-h-none md:w-[420px] md:max-w-[420px] md:rounded-l-[var(--radius-sheet)] md:rounded-r-none md:rounded-t-none";

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  disablePlatformDismiss?: boolean;
  variant?: DialogVariant;
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
      variant = "dialog",
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

    const isSheet = variant === "sheet";

    return (
      <DialogPointerDownOutsideContext.Provider value={pointerDownOutsideGuard}>
        <DialogPortal>
          {/* The sheet panel beside the content (1024px+) has no overlay. */}
          <DialogOverlay className={isSheet ? "lg:hidden" : undefined} />
          <DialogPrimitive.Content
            ref={setRef}
            data-dialog-variant={variant}
            className={cn(
              "fixed z-50 grid bg-[var(--color-surface)]",
              isSheet ? "overflow-hidden" : "border-0",
              isSheet ? sheetShapeClassName : dialogShapeClassName,
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
            {isSheet ? (
              <div
                aria-hidden="true"
                data-sheet-handle
                className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-light)] md:hidden"
              />
            ) : null}
            {children}
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPointerDownOutsideContext.Provider>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Shared look of the header close and back buttons: a 32px icon with a 44px
 * touch area (the `before` pseudo-element), muted until hovered.
 */
export const dialogIconButtonClassName =
  "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-50 before:absolute before:left-1/2 before:top-1/2 before:h-[max(100%,var(--tap-min-height))] before:w-[max(100%,var(--tap-min-height))] before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

export const DialogMobileContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, ...props }, ref) => {
  return (
    <DialogContent
      ref={ref}
      className={cn("grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0", className)}
      {...props}
    />
  );
});
DialogMobileContent.displayName = "DialogMobileContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)} {...props} />;
}

export const DialogMobileBack = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(
  ({ className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label="Volver"
        className={cn(dialogIconButtonClassName, className)}
        {...props}
      >
        <Icon name="arrow-left" className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  },
);
DialogMobileBack.displayName = "DialogMobileBack";

export const DialogMobileClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(({ className, children, type = "button", ...props }, ref) => {
  return (
    <DialogClose asChild>
      <button
        ref={ref}
        type={type}
        aria-label="Cerrar"
        className={cn(dialogIconButtonClassName, className)}
        {...props}
      >
        {children ?? <Icon name="close" className="h-4 w-4" aria-hidden="true" />}
      </button>
    </DialogClose>
  );
});
DialogMobileClose.displayName = "DialogMobileClose";

/**
 * Fixed 52px header: the title sits on the left and the ✕ on the right, always.
 * An optional `DialogMobileBack` goes before the title (multi-step flows). If no
 * `DialogMobileClose` is passed, the ✕ is added. Other children (for example a
 * `DialogDescription`) render in a sub-row under the bar and never push the ✕.
 */
export function DialogMobileHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const items = React.Children.toArray(children);
  const isTitle = (node: React.ReactNode) => React.isValidElement(node) && node.type === DialogTitle;
  const isBack = (node: React.ReactNode) => React.isValidElement(node) && node.type === DialogMobileBack;
  const isClose = (node: React.ReactNode) => React.isValidElement(node) && node.type === DialogMobileClose;

  const titles = items
    .filter(isTitle)
    .map((node) =>
      React.cloneElement(node as React.ReactElement<{ className?: string }>, {
        className: cn("truncate", (node as React.ReactElement<{ className?: string }>).props.className),
      }),
    );
  const closes = items.filter(isClose);
  const rest = items.filter((node) => !isTitle(node) && !isBack(node) && !isClose(node));

  return (
    <div
      data-dialog-header
      className={cn("relative shrink-0 border-b border-[var(--color-border-subtle)] text-left", className)}
      {...props}
    >
      <div className="flex h-[52px] items-center gap-2 px-4 sm:px-6">
        {items.filter(isBack)}
        <div className="flex min-w-0 flex-1 items-center">{titles}</div>
        {closes.length > 0 ? closes : <DialogMobileClose />}
      </div>
      {rest.length > 0 ? <div className="px-4 pb-3 sm:px-6">{rest}</div> : null}
    </div>
  );
}

type DialogMobileBodyProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "default" | "none";
};

/** The only scroll zone of a dialog or sheet; the header and footer stay fixed. */
export function DialogMobileBody({ className, padding = "default", ...props }: DialogMobileBodyProps) {
  return (
    <div
      className={cn(
        "min-h-0 overflow-y-auto overscroll-contain",
        padding === "default" ? "px-4 py-4 sm:px-6 sm:py-6" : "p-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Fixed footer outside the body. Children keep DOM order: the secondary action
 * first (left) and the primary last (right, pushed to the end).
 */
export function DialogMobileFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-dialog-footer
      className={cn(
        "row-start-3 flex shrink-0 items-center gap-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3 sm:px-6 [&>:last-child]:ml-auto",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Container for destructive actions at the end of a body. Its actions use the
 * outlined `danger` Button variant; the container itself adds only a divider.
 */
export function DialogDangerZone({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-dialog-danger-zone
      className={cn("mt-2 grid gap-2 border-t border-[var(--color-border-subtle)] pt-4", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight text-[var(--color-text-main)]", className)}
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
      className={cn("text-sm text-[var(--color-text-muted)]", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = DialogPrimitive.Description.displayName;
