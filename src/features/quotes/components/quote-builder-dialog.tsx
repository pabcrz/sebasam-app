"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { useRouter } from "next/navigation";
import {
  Button,
} from "@/components/ui";
import { QuoteBuilder, QuoteBuilderChromeContext } from "./quote-builder";
import type { QuoteBuilderChromeHosts, QuoteBuilderDialogProps } from "./quote-builder-contracts";
import { QuoteBuilderDialogShell } from "./quote-builder-dialog-shell";
import { mapPersistedQuoteToBuilderInitialData } from "./quote-builder-mapper";

export type { QuoteBuilderDialogProps } from "./quote-builder-contracts";

export function QuoteBuilderDialog({
  customers,
  createAction,
  saveAction,
  initialData: initialDataProp,
  quote,
  quoteNumber,
  triggerClassName,
  triggerAriaLabel,
  triggerSize,
  triggerVariant,
  triggerIconOnlyMobile = false,
  triggerIconOnly = false,
  triggerDisabled = false,
  triggerLabel,
  createCustomerAction,
  searchCustomersAction,
  mode = "quote",
  masters,
}: QuoteBuilderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [builderKey, setBuilderKey] = React.useState(0);
  // The builder renders its stepper and footer into these hosts (rendered in
  // QuoteBuilderDialogShell's fixed slots) through QuoteBuilderChromeContext. The host
  // ref callbacks flip this state when the slots attach/detach, making the
  // context reactive: the builder portals its chrome once both hosts exist,
  // regardless of sibling commit ordering.
  const [chromeHosts, setChromeHosts] = React.useState<QuoteBuilderChromeHosts>({
    stepperHost: null,
    footerHost: null,
  });
  const attachStepperHost = React.useCallback((el: HTMLDivElement | null) => {
    setChromeHosts((current) => (current.stepperHost === el ? current : { ...current, stepperHost: el }));
  }, []);
  const attachFooterHost = React.useCallback((el: HTMLDivElement | null) => {
    setChromeHosts((current) => (current.footerHost === el ? current : { ...current, footerHost: el }));
  }, []);
  const isEdit = saveAction != null;
  const isDirectWorkOrder = mode === "direct-work-order" || mode === "direct";
  const initialData = initialDataProp ?? (quote ? mapPersistedQuoteToBuilderInitialData(quote) : undefined);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true);
      return;
    }
    if (!dirty) {
      setOpen(false);
    }
  }, [dirty]);

  const discardChanges = React.useCallback(() => {
    setOpen(false);
    setDirty(false);
    setBuilderKey((current) => current + 1);
  }, []);

  const handleSuccess = React.useCallback(() => {
    setDirty(false);
    setOpen(false);
    setBuilderKey((current) => current + 1);
    router.refresh();
  }, [router]);

  const defaultButtonLabel = isEdit
    ? "Editar"
    : mode === "direct-note" || mode === "direct-sale"
      ? "Nueva nota"
      : isDirectWorkOrder
        ? "Agregar trabajo"
        : "Nueva cotización";
  const effectiveButtonLabel = triggerLabel ?? defaultButtonLabel;
  const dialogTitle = isEdit
    ? `Editar cotización ${quoteNumber}`
    : mode === "direct-note" || mode === "direct-sale"
      ? "Nueva nota"
      : isDirectWorkOrder
        ? "Agregar trabajo"
        : "Crear cotización";
  const discardTitle = isEdit
    ? "¿Descartar los cambios?"
    : mode === "direct-note" || mode === "direct-sale"
      ? "¿Descartar la nota?"
      : isDirectWorkOrder
        ? "¿Descartar el trabajo?"
        : "¿Descartar la cotización?";

  return (
    <QuoteBuilderChromeContext.Provider value={chromeHosts}>
      <QuoteBuilderDialogShell
        open={open}
        onOpenChange={handleOpenChange}
        title={dialogTitle}
        dirty={dirty}
        onDiscard={discardChanges}
        discardTitle={discardTitle}
        discardDescription={isEdit ? "Si sales sin guardar, perderás las modificaciones hechas a esta cotización." : "Se perderá todo el progreso que no hayas guardado."}
        discardCancelLabel="Seguir editando"
        discardConfirmLabel="Descartar cambios"
        trigger={
          <Button
            type="button"
            variant={triggerVariant ?? "primary"}
            size={triggerSize}
            className={triggerIconOnlyMobile ? `h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3 ${triggerClassName ?? ""}` : (triggerClassName ?? "w-full sm:w-fit")}
            title={triggerAriaLabel ?? ((triggerIconOnly || triggerIconOnlyMobile) ? (isEdit ? `Editar cotización ${quoteNumber}` : effectiveButtonLabel) : undefined)}
            aria-label={triggerAriaLabel ?? ((triggerIconOnly || triggerIconOnlyMobile) ? (isEdit ? `Editar cotización ${quoteNumber}` : effectiveButtonLabel) : undefined)}
            disabled={triggerDisabled}
          >
            {isEdit ? <Icon name="edit" className={triggerIconOnly ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" /> : <Icon name="plus" className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />}
            <span className={triggerIconOnly ? "sr-only" : triggerIconOnlyMobile ? "sr-only sm:not-sr-only" : undefined}>{effectiveButtonLabel}</span>
          </Button>
        }
        stepper={<div ref={attachStepperHost} />}
        footer={<div ref={attachFooterHost} className="contents" data-testid="quote-builder-footer-host" />}
        body={
          <QuoteBuilder
            key={builderKey}
            customers={customers}
            createAction={createAction}
            saveAction={saveAction}
            initialData={initialData}
            createCustomerAction={createCustomerAction}
            searchCustomersAction={searchCustomersAction}
            layout="dialog"
            onDirtyChange={setDirty}
            onSuccess={handleSuccess}
            mode={mode}
            masters={masters}
          />
        }
      />
    </QuoteBuilderChromeContext.Provider>
  );
}
