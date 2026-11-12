"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  className?: string;
  onConfirm: () => void;
  /** Optional body content rendered between the description and the footer. */
  children?: React.ReactNode;
  /** Forwarded to the dialog content (e.g. blocking dismissal while loading). */
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: CustomEvent) => void;
  /** Forwarded to the dialog content (e.g. returning focus to the trigger). */
  onCloseAutoFocus?: (event: Event) => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  loading = false,
  className,
  onConfirm,
  children,
  onEscapeKeyDown,
  onPointerDownOutside,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogMobileContent
        className={cn("max-w-[440px]", className)}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogMobileHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogMobileClose disabled={loading} />
        </DialogMobileHeader>
        {description || children ? (
          <DialogMobileBody>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
            {children ? <div className="mt-2 grid gap-2">{children}</div> : null}
          </DialogMobileBody>
        ) : null}
        <DialogMobileFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogMobileFooter>
      </DialogMobileContent>
    </Dialog>
  );
}
