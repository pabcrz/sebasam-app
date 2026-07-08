"use client";

import * as React from "react";
import { X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { QuoteBuilder } from "./quote-builder";

type CustomerOption = {
  id: string;
  name: string;
};

type QuoteBuilderDialogProps = {
  customers: CustomerOption[];
  createAction: (formData: FormData) => void | Promise<void>;
  createCustomerAction?: (input: unknown) => Promise<{
    success: boolean;
    customer?: CustomerOption;
    error?: string;
    reused?: boolean;
  }>;
};

export function QuoteBuilderDialog({ customers, createAction, createCustomerAction }: QuoteBuilderDialogProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Only allow explicit open triggers. Outside clicks, overlay clicks and
        // Escape must not close this dialog; the user must use X or Cancelar.
        if (nextOpen) setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="primary">
          Nueva cotización
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-4xl"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="relative">
          <DialogTitle>Nueva cotización</DialogTitle>
          <DialogDescription>
            Completa el flujo para crear una cotización en borrador.
          </DialogDescription>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </DialogHeader>
        <QuoteBuilder
          customers={customers}
          createAction={createAction}
          createCustomerAction={createCustomerAction}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
