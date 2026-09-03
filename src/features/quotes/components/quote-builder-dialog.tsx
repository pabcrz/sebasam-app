"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  MultiStepDialog,
} from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";
import { QuoteBuilder, QuoteBuilderChromeContext, type QuoteBuilderChromeHosts, type QuoteBuilderInitialData } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";
import type { QuoteListSummary } from "../queries";

type CustomerOption = {
  id: string;
  name: string;
};
type QuoteBuilderDialogProps = {
  customers: CustomerOption[];
  createAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  saveAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  initialData?: QuoteBuilderInitialData;
  quote?: QuoteListSummary;
  quoteNumber?: string;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  triggerSize?: "default" | "sm";
  triggerVariant?: ButtonVariant;
  triggerIconOnlyMobile?: boolean;
  triggerIconOnly?: boolean;
  createCustomerAction?: (input: unknown) => Promise<{
    success: boolean;
    customer?: CustomerOption;
    error?: string;
    reused?: boolean;
  }>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
};

export function QuoteBuilderDialog({ customers, createAction, saveAction, initialData: initialDataProp, quote, quoteNumber, triggerClassName, triggerAriaLabel, triggerSize, triggerVariant, triggerIconOnlyMobile = false, triggerIconOnly = false, createCustomerAction, searchCustomersAction }: QuoteBuilderDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [builderKey, setBuilderKey] = React.useState(0);
  // The builder renders its stepper and footer into these hosts (rendered in
  // MultiStepDialog's fixed slots) through QuoteBuilderChromeContext. The host
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
    discountCents: Number(quote.discountCents ?? 0),
    operationalDate: quote.operationalDate.toISOString().slice(0, 10),
    isOperationalDateEditable: quote.status === "DRAFT",
    sections: quote.sections && quote.sections.length > 0
      ? quote.sections.map((section) => ({
          name: section.name,
          isAuthorized: section.isAuthorized,
          items: section.items.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: String(Number(item.quantity)),
            unitPrice: String(Number(item.unitPriceCents) / 100),
            includeInPayroll: Boolean((item as { includeInPayroll?: boolean }).includeInPayroll),
            customRatePercent: (item as { customRatePercent?: number | null }).customRatePercent != null ? String((item as { customRatePercent?: number | null }).customRatePercent) : "40",
          })),
        }))
      : [{
          name: "General",
          items: quote.items.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: String(Number(item.quantity)),
            unitPrice: String(Number(item.unitPriceCents) / 100),
            includeInPayroll: Boolean((item as { includeInPayroll?: boolean }).includeInPayroll),
            customRatePercent: (item as { customRatePercent?: number | null }).customRatePercent != null ? String((item as { customRatePercent?: number | null }).customRatePercent) : "40",
          })),
        }],
  } : undefined);

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

  return (
    <QuoteBuilderChromeContext.Provider value={chromeHosts}>
      <MultiStepDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={isEdit ? `Editar cotización ${quoteNumber}` : "Crear cotización"}
        dirty={dirty}
        onDiscard={discardChanges}
        discardTitle={isEdit ? "¿Descartar los cambios?" : "¿Descartar la cotización?"}
        discardDescription={isEdit ? "Si sales sin guardar, perderás las modificaciones hechas a esta cotización." : "Se perderá todo el progreso que no hayas guardado."}
        discardCancelLabel="Seguir editando"
        discardConfirmLabel="Descartar cambios"
        trigger={
          <Button
            type="button"
            variant={triggerVariant ?? "primary"}
            size={triggerSize}
            className={triggerIconOnlyMobile ? `h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3 ${triggerClassName ?? ""}` : (triggerClassName ?? "w-full sm:w-fit")}
            title={triggerAriaLabel ?? ((triggerIconOnly || triggerIconOnlyMobile) ? (isEdit ? `Editar cotización ${quoteNumber}` : "Nueva cotización") : undefined)}
            aria-label={triggerAriaLabel ?? ((triggerIconOnly || triggerIconOnlyMobile) ? (isEdit ? `Editar cotización ${quoteNumber}` : "Nueva cotización") : undefined)}
          >
            {isEdit ? <Pencil className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" /> : <Plus className={triggerIconOnly ? "h-6 w-6" : "h-4 w-4"} aria-hidden="true" />}
            <span className={triggerIconOnly ? "sr-only" : triggerIconOnlyMobile ? "sr-only sm:not-sr-only" : undefined}>{isEdit ? "Editar" : "Nueva cotización"}</span>
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
          />
        }
      />
    </QuoteBuilderChromeContext.Provider>
  );
}
