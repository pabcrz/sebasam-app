"use client";

import * as React from "react";
import { Pencil, X } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";
import { QuoteBuilder, type QuoteBuilderInitialData } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";
import type { listQuotes } from "../queries";

type CustomerOption = {
  id: string;
  name: string;
};
type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

type QuoteBuilderDialogProps = {
  customers: CustomerOption[];
  createAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  saveAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  initialData?: QuoteBuilderInitialData;
  quote?: QuoteListItem;
  quoteNumber?: string;
  triggerClassName?: string;
  triggerSize?: "default" | "sm";
  triggerVariant?: ButtonVariant;
  createCustomerAction?: (input: unknown) => Promise<{
    success: boolean;
    customer?: CustomerOption;
    error?: string;
    reused?: boolean;
  }>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
};

export function QuoteBuilderDialog({ customers, createAction, saveAction, initialData: initialDataProp, quote, quoteNumber, triggerClassName, triggerSize, triggerVariant, createCustomerAction, searchCustomersAction }: QuoteBuilderDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [builderKey, setBuilderKey] = React.useState(0);
  const closeRequestFocusRef = React.useRef<HTMLElement | null>(null);
  const isEdit = saveAction != null;
  const snapshot = quote?.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : undefined;
  const initialData = initialDataProp ?? (quote ? {
    customerId: quote.customerId,
    vehicle: {
      plate: quote.vehicle?.plate ?? String(snapshot?.plate ?? ""),
      brand: quote.vehicle?.brand ?? String(snapshot?.brand ?? ""),
      model: quote.vehicle?.model ?? String(snapshot?.model ?? ""),
      year: quote.vehicle?.year != null ? String(quote.vehicle.year) : String(snapshot?.year ?? ""),
    },
    title: quote.title,
    description: quote.description ?? "",
    administrative: quote.administrative,
    taxEnabled: quote.taxEnabled,
    items: quote.items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: String(Number(item.quantity)),
      unitPrice: String(Number(item.unitPriceCents) / 100),
    })),
  } : undefined);

  const requestClose = React.useCallback(() => {
    if (!dirty) {
      setOpen(false);
      return;
    }
    closeRequestFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmCloseOpen(true);
  }, [dirty]);

  const handleConfirmCloseOpenChange = React.useCallback((nextOpen: boolean) => {
    setConfirmCloseOpen(nextOpen);
    if (!nextOpen) {
      window.requestAnimationFrame(() => closeRequestFocusRef.current?.focus());
    }
  }, []);

  const discardChanges = React.useCallback(() => {
    setConfirmCloseOpen(false);
    setOpen(false);
    setDirty(false);
    setBuilderKey((current) => current + 1);
  }, []);

  const handleSuccess = React.useCallback(() => {
    setDirty(false);
    setOpen(false);
    setBuilderKey((current) => current + 1);
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
          <Button type="button" variant={triggerVariant ?? "primary"} size={triggerSize} className={triggerClassName}>
            {isEdit ? <Pencil className="h-4 w-4" aria-hidden="true" /> : null}
            {isEdit ? "Editar" : "Nueva cotización"}
          </Button>
        </DialogTrigger>
        <DialogContent
          className="!inset-0 !h-dvh !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none p-4 sm:!bottom-auto sm:!left-1/2 sm:!right-auto sm:!top-1/2 sm:!h-[min(90dvh,52rem)] sm:!max-h-[min(90dvh,52rem)] sm:!w-[min(92vw,64rem)] sm:!max-w-5xl sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-[var(--radius-lg)] sm:p-6"
          style={{
            alignItems: "stretch",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          <DialogHeader
            className="relative"
            style={{ alignItems: "stretch", flexShrink: 0, justifyContent: "flex-start" }}
          >
            <DialogTitle>{isEdit ? `Editar cotización ${quoteNumber}` : "Crear cotización"}</DialogTitle>
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
            key={builderKey}
            customers={customers}
            createAction={createAction}
            saveAction={saveAction}
            initialData={initialData}
            createCustomerAction={createCustomerAction}
            searchCustomersAction={searchCustomersAction}
            layout="dialog"
            onCancel={requestClose}
            onDirtyChange={setDirty}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={handleConfirmCloseOpenChange}
        title={isEdit ? "¿Descartar los cambios?" : "¿Descartar la cotización?"}
        description={isEdit ? "Si sales sin guardar, perderás las modificaciones hechas a esta cotización." : "Se perderá todo el progreso que no hayas guardado."}
        cancelLabel="Seguir editando"
        confirmLabel="Descartar cambios"
        variant="danger"
        onConfirm={discardChanges}
      />
    </>
  );
}
