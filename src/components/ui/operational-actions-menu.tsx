"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";

export type OperationalActionsMenuProps = {
  title?: string;
  triggerText?: string;
  description?: string;
  triggerAriaLabel: string;
  triggerTitle?: string;
  children: ReactNode;
  destructive?: ReactNode;
  triggerClassName?: string;
  triggerIconOnly?: boolean;
};

export function OperationalActionsMenu({
  title = "Más acciones",
  triggerText = "Más acciones",
  description,
  triggerAriaLabel,
  triggerTitle,
  children,
  destructive,
  triggerClassName,
  triggerIconOnly = false,
}: OperationalActionsMenuProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={triggerClassName ?? "min-h-11 px-3"}
          aria-label={triggerAriaLabel}
          title={triggerTitle ?? triggerAriaLabel}
        >
          <Icon name="more" className="h-5 w-5" aria-hidden="true" />
          <span className={triggerIconOnly ? "sr-only" : undefined}>{triggerText}</span>
        </Button>
      </DialogTrigger>
      <DialogMobileContent className="max-w-md" onClick={(event) => event.stopPropagation()}>
        <DialogMobileHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          <DialogMobileClose aria-label={`Cerrar ${title.toLowerCase()}`} />
        </DialogMobileHeader>
        <DialogMobileBody>
          <div className="grid gap-2 [&_button]:w-full">{children}</div>
          {destructive ? (
            <div className="mt-4 border-t border-[var(--color-status-danger-border)] pt-4 [&_button]:w-full">
              {destructive}
            </div>
          ) : null}
        </DialogMobileBody>
      </DialogMobileContent>
    </Dialog>
  );
}
