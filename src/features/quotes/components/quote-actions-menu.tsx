"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
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

type QuoteActionsMenuProps = {
  quoteNumber: string;
  children: ReactNode;
  destructive?: ReactNode;
};

export function QuoteActionsMenu({ quoteNumber, children, destructive }: QuoteActionsMenuProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 px-3"
          aria-label={`Más acciones de cotización ${quoteNumber}`}
          title={`Más acciones de cotización ${quoteNumber}`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>Más acciones</span>
        </Button>
      </DialogTrigger>
      <DialogMobileContent className="max-w-md" onClick={(event) => event.stopPropagation()}>
        <DialogMobileHeader>
          <DialogTitle>Acciones de cotización</DialogTitle>
          <DialogDescription>Acciones disponibles para {quoteNumber}.</DialogDescription>
          <DialogMobileClose aria-label={`Cerrar acciones de cotización ${quoteNumber}`} />
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
