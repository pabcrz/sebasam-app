"use client";

import * as React from "react";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { loadQuoteDetailAction, type QuoteFormActionState } from "../actions";
import type { QuoteDetail, QuoteListSummary } from "../queries";

type CustomerOption = {
  id: string;
  name: string;
};
type QuoteReference = Pick<QuoteListSummary, "id" | "number">;

type QuoteBuilderDialogProps = {
  customers: CustomerOption[];
  createAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  saveAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  initialData?: QuoteBuilderInitialData;
  quote?: QuoteReference;
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
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<QuoteDetail | null>(null);
  const [detailFailure, setDetailFailure] = React.useState<{ quoteId: string; retry: number; message: string } | null>(null);
  const [detailRetry, setDetailRetry] = React.useState(0);
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [builderKey, setBuilderKey] = React.useState(0);
  const closeRequestFocusRef = React.useRef<HTMLElement | null>(null);
  const isEdit = saveAction != null;
  const quoteId = quote?.id;
  const quoteDetail = detail?.id === quote?.id ? detail : null;
  const needsDetail = open && isEdit && quoteId != null && initialDataProp == null;
  const detailError = detailFailure?.quoteId === quoteId && detailFailure?.retry === detailRetry
    ? detailFailure.message
    : null;
  const loadingDetail = needsDetail && !detailError && quoteDetail == null;
  const snapshot = quoteDetail?.vehicleSnapshot && typeof quoteDetail.vehicleSnapshot === "object" && !Array.isArray(quoteDetail.vehicleSnapshot)
    ? quoteDetail.vehicleSnapshot as Record<string, unknown>
    : undefined;
  const initialData = initialDataProp ?? (quoteDetail ? {
    customerId: quoteDetail.customerId,
    vehicle: {
      plate: quoteDetail.vehicle?.plate ?? String(snapshot?.plate ?? ""),
      brand: quoteDetail.vehicle?.brand ?? String(snapshot?.brand ?? ""),
      model: quoteDetail.vehicle?.model ?? String(snapshot?.model ?? ""),
      year: quoteDetail.vehicle?.year != null ? String(quoteDetail.vehicle.year) : String(snapshot?.year ?? ""),
    },
    title: quoteDetail.title,
    description: quoteDetail.description ?? "",
    administrative: quoteDetail.administrative,
    taxEnabled: quoteDetail.taxEnabled,
    discountCents: Number(quoteDetail.discountCents ?? 0),
    sections: quoteDetail.sections.length > 0
      ? quoteDetail.sections.map((section) => ({
          name: section.name,
          items: section.items.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: String(Number(item.quantity)),
            unitPrice: String(Number(item.unitPriceCents) / 100),
          })),
        }))
      : [{
          name: "General",
          items: quoteDetail.items.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: String(Number(item.quantity)),
            unitPrice: String(Number(item.unitPriceCents) / 100),
          })),
        }],
  } : undefined);

  React.useEffect(() => {
    if (!needsDetail || !quoteId) return;

    let active = true;

    void loadQuoteDetailAction(quoteId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch(() => {
        if (active) setDetailFailure({ quoteId, retry: detailRetry, message: "No se pudo cargar la cotización. Intenta de nuevo." });
      });

    return () => {
      active = false;
    };
  }, [detailRetry, needsDetail, quoteId]);

  const resetDetail = React.useCallback(() => {
    setDetail(null);
    setDetailFailure(null);
  }, []);

  const requestClose = React.useCallback(() => {
    if (!dirty) {
      resetDetail();
      setOpen(false);
      return;
    }
    closeRequestFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmCloseOpen(true);
  }, [dirty, resetDetail]);

  const handleConfirmCloseOpenChange = React.useCallback((nextOpen: boolean) => {
    setConfirmCloseOpen(nextOpen);
    if (!nextOpen) {
      window.requestAnimationFrame(() => closeRequestFocusRef.current?.focus());
    }
  }, []);

  const discardChanges = React.useCallback(() => {
    setConfirmCloseOpen(false);
    resetDetail();
    setOpen(false);
    setDirty(false);
    setBuilderKey((current) => current + 1);
  }, [resetDetail]);

  const handleSuccess = React.useCallback(() => {
    setDirty(false);
    resetDetail();
    setOpen(false);
    setBuilderKey((current) => current + 1);
    router.refresh();
  }, [resetDetail, router]);

  const retryDetail = () => {
    resetDetail();
    setDetailRetry((attempt) => attempt + 1);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            resetDetail();
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
          {loadingDetail ? <p role="status" className="py-8 text-center text-sm text-[var(--color-text-muted)]">Cargando cotización...</p> : null}
          {detailError ? (
            <div role="alert" className="grid gap-3 py-4 text-sm text-[var(--color-status-danger-fg)]">
              <p>{detailError}</p>
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={retryDetail}>
                Reintentar
              </Button>
            </div>
          ) : null}
          {!loadingDetail && !detailError ? (
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
          ) : null}
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
