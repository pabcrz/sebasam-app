"use client";

import * as React from "react";
import { X } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
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
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
};

export function QuoteBuilderDialog({ customers, createAction, createCustomerAction, searchCustomersAction }: QuoteBuilderDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const closeRequestFocusRef = React.useRef<HTMLElement | null>(null);

  const requestClose = React.useCallback(() => {
    closeRequestFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmCloseOpen(true);
  }, []);

  const handleConfirmCloseOpenChange = React.useCallback((nextOpen: boolean) => {
    setConfirmCloseOpen(nextOpen);
    if (!nextOpen) {
      window.requestAnimationFrame(() => closeRequestFocusRef.current?.focus());
    }
  }, []);

  const discardChanges = React.useCallback(() => {
    setConfirmCloseOpen(false);
    setOpen(false);
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setOpen(true);
          } else {
            requestClose();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="primary">
            Nueva cotización
          </Button>
        </DialogTrigger>
        <DialogContent className="grid h-[85dvh] max-h-[85dvh] max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader className="relative">
            <DialogTitle>Crear cotización</DialogTitle>
            <button
              type="button"
              onClick={requestClose}
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
            searchCustomersAction={searchCustomersAction}
            onCancel={requestClose}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={handleConfirmCloseOpenChange}
        title="¿Descartar la cotización?"
        description="Se perderá todo el progreso que no hayas guardado."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar cambios"
        variant="danger"
        onConfirm={discardChanges}
      />
    </>
  );
}
