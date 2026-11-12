"use client";

import * as React from "react";
import { QuoteItemType } from "@/generated/prisma/enums";
import { getMeaningfulTextError } from "@/lib/meaningful-text";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Checkbox,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  Input,
  Label,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  Switch,
  Textarea,
} from "@/components/ui";
import { createQuoteValidUntil } from "@/features/quotes/lib/calculate";
import {
  defaultOperationalCalendarDate,
  isSundayOperationalDate,
  mexicoCityCalendarDate,
} from "@/features/quotes/lib/operational-date";
import { formatQuoteContactRole } from "@/features/quotes/lib/quote-snapshot-display";
import { formatCents } from "@/features/quotes/lib/format";
import {
  getStepError,
  normalizeSections,
  Step,
  steps,
  flowStepLabels,
  validateItemValue,
} from "./quote-builder-shared";
import { useQuoteCustomerSearch } from "./use-quote-customer-search";
import { QuoteBuilderItemsStep } from "./quote-builder-items-step";
import { QuoteBuilderProgress, QuoteBuilderStepper } from "./quote-builder-stepper";
import type { QuotePreviewCardProps } from "./quote-preview-card";
import { toDocumentPreviewProps } from "./document-preview-model";
import { DocumentPreview } from "@/components/document-preview";
import { quoteStatusLabels } from "@/features/quotes/lib/status";
import type { QuoteFormActionState } from "../actions";
import { createCustomerContactAction } from "@/features/customers/actions";
import {
  initializeQuoteBuilderState,
  quoteBuilderReducer,
  selectNextItemRowId,
  selectQuoteBuilderSummary,
  serializeQuoteBuilderSnapshot,
  type QuoteBuilderItemsAction,
} from "./quote-builder-state";
import type {
  CustomerOption,
  QuoteBuilderChromeHosts,
  QuoteBuilderProps,
  QuoteCustomerActionResult,
} from "./quote-builder-contracts";

export type {
  CustomerOption,
  QuoteBuilderChromeHosts,
  QuoteBuilderInitialData,
  QuoteBuilderProps,
  QuoteCustomerActionResult,
} from "./quote-builder-contracts";

/**
 * Host elements for the dialog chrome slots (stepper + footer). The dialog
 * shell owns them as state and provides them through
 * `QuoteBuilderChromeContext`; consumed only when `layout === "dialog"` so the
 * stepper and footer render into `MultiStepDialog`'s fixed slots instead of
 * inside the form. Reactivity is driven by the provider's host ref callbacks,
 * so the consumer re-renders the portals once both hosts are attached — no
 * effect ordering involved.
 */
export const QuoteBuilderChromeContext = React.createContext<QuoteBuilderChromeHosts | null>(null);

const customerListGap = 4;
const customerListViewportMargin = 8;
const customerListMaxHeight = 224;

export function QuoteBuilder({
  customers,
  createAction,
  saveAction,
  createCustomerAction,
  searchCustomersAction,
  initialData,
  onDirtyChange,
  onSuccess,
  layout = "page",
  fullScreen = false,
  mode = "quote",
  masters = [],
}: QuoteBuilderProps) {
  const isEdit = saveAction != null;
  const action = saveAction ?? createAction;
  const [actionState, formAction, isSubmitting] = React.useActionState(
    async (state: QuoteFormActionState, formData: FormData) => (await action?.(state, formData)) ?? {},
    {},
  );
  const initialSelectedCustomer = customers.find((customer) => customer.id === initialData?.customerId);
  const [isCustomerListOpen, setIsCustomerListOpen] = React.useState(false);
  const [activeCustomerIndex, setActiveCustomerIndex] = React.useState(-1);
  const isDirect = mode === "direct" || mode === "direct-work-order" || mode === "direct-note" || mode === "direct-sale";
  const isUnifiedDirect = isDirect;
  const initialOperation = initialData?.operation ?? (mode === "direct-sale" ? "SALE" : "WORK");
  const [operation, setOperation] = React.useState<"WORK" | "SALE">(initialOperation);
  const isSale = operation === "SALE";
  const isSaleNote = isUnifiedDirect && isSale;
  const isWorkshopDirect = isUnifiedDirect && operation === "WORK";
  const [masterId, setMasterId] = React.useState("");
  const [isCompleted, setIsCompleted] = React.useState(mode === "direct-note");
  const [paymentDueDate, setPaymentDueDate] = React.useState("");
  const customerInputRef = React.useRef<HTMLInputElement>(null);
  const customerListRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const submitButtonRef = React.useRef<HTMLButtonElement>(null);
  const hasExplicitSubmitRequest = React.useRef(false);
  const [customerListPosition, setCustomerListPosition] = React.useState<React.CSSProperties>({});
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const hasChangedStep = React.useRef(false);
  const [step, setStep] = React.useState<Step>("client");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState("");
  const [newCustomerLegalName, setNewCustomerLegalName] = React.useState("");
  const [newCustomerContactName, setNewCustomerContactName] = React.useState("");
  const [newCustomerContactPhone, setNewCustomerContactPhone] = React.useState("");
  const [newCustomerEmail, setNewCustomerEmail] = React.useState("");
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("");
  const [createCustomerMessage, setCreateCustomerMessage] = React.useState<string | null>(null);
  const [createCustomerError, setCreateCustomerError] = React.useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = React.useState(false);
  const [builderState, dispatch] = React.useReducer(
    quoteBuilderReducer,
    undefined,
    () => initializeQuoteBuilderState(initialData, defaultOperationalCalendarDate()),
  );
  const {
    customerId,
    customerContactId,
    customerFiscalProfileId,
    vehicle,
    title,
    description,
    administrative,
    taxEnabled,
    discount,
    operationalDate,
    sections,
  } = builderState;
  const onCustomerSearchResults = React.useCallback((results: CustomerOption[]) => {
    setActiveCustomerIndex(results.length ? 0 : -1);
  }, []);
  const {
    customerOptions,
    customerSearch,
    customerSearchError,
    isSearchingCustomers,
    updateCustomerSearch,
    selectSearchCustomer,
    clearCustomerSearchCache,
  } = useQuoteCustomerSearch({
    customers,
    initialSelectedCustomer,
    customerId,
    searchCustomersAction,
    onResults: onCustomerSearchResults,
  });
  const isOperationalDateEditable = initialData?.isOperationalDateEditable ?? true;
  const [expandedItemRowId, setExpandedItemRowId] = React.useState<string | null>(
    builderState.sections[0]?.rowIds[0] ?? null,
  );

  const [animatedItemRowId, setAnimatedItemRowId] = React.useState<string | null>(null);
  const pendingItemRowId = React.useRef<string | null>(null);
  const itemRowRefs = React.useRef(new Map<string, HTMLElement>());
  const itemDescriptionRefs = React.useRef(new Map<string, HTMLInputElement>());
  const itemTypeRefs = React.useRef(new Map<string, HTMLElement>());

  const [initialFormState] = React.useState(() =>
    serializeQuoteBuilderSnapshot(builderState, initialSelectedCustomer?.name ?? "", ["", "", ""]),
  );

  const currentStepIndex = steps.indexOf(step);
  const { completeItemsCount, discountCents, subtotalCents, taxCents, totalCents } =
    selectQuoteBuilderSummary(builderState);
  const selectedCustomer = customerOptions.find((customer) => customer.id === customerId);
  const validUntil = createQuoteValidUntil();
  const titleError = title.trim() === "" ? null : getMeaningfulTextError(title, "título");
  const newCustomerNameError = newCustomerName === "" ? null : getMeaningfulTextError(newCustomerName, "nombre");

  React.useEffect(() => {
    if (actionState.success) onSuccess?.();
  }, [actionState.success, onSuccess]);

  React.useEffect(() => {
    const current = serializeQuoteBuilderSnapshot(builderState, customerSearch, [newCustomerName, newCustomerEmail, newCustomerPhone]);
    const isDirectDirty = isUnifiedDirect ? Boolean(masterId || paymentDueDate) : false;
    onDirtyChange?.(current !== initialFormState || isDirectDirty || operation !== initialOperation);
  }, [builderState, customerSearch, newCustomerEmail, newCustomerName, newCustomerPhone, onDirtyChange, initialFormState, initialOperation, isUnifiedDirect, masterId, operation, paymentDueDate]);

  function changeOperation(next: "WORK" | "SALE") {
    if (next === operation) return;
    if (next === "SALE") {
      const hasIneligibleItems = sections.some((section) => section.items.some((item) =>
        (item.type === "LABOR" || item.type === "OTHER") &&
        (item.description.trim() !== "" || item.unitPrice.trim() !== "" || item.quantity !== "1"),
      ));
      if (hasIneligibleItems) {
        setStepError("No puedes cambiar a Venta de refacciones mientras existan conceptos de mano de obra u otros. Elimínalos o cámbialos antes de continuar.");
        return;
      }
      dispatch({
        type: "replaceSections",
        sections: sections.map((section) => ({
          ...section,
          items: section.items.map((item) => item.description.trim() === "" && item.unitPrice.trim() === "" && item.quantity === "1"
            ? { ...item, type: "MATERIAL" as QuoteItemType }
            : item),
        })),
      });
    }
    setOperation(next);
    setStepError(null);
  }

  React.useEffect(() => {
    if (!hasChangedStep.current) {
      hasChangedStep.current = true;
      return;
    }

    const scroller = scrollAreaRef.current?.closest<HTMLElement>("[data-testid='multi-step-dialog-body']") ?? scrollAreaRef.current;
    if (scroller) scroller.scrollTop = 0;
    const activeHeading = scrollAreaRef.current?.querySelector<HTMLElement>(
      `[data-step-heading="${step}"]`,
    );
    activeHeading?.focus({ preventScroll: true });
  }, [step]);

  React.useEffect(() => {
    const rowId = pendingItemRowId.current;
    if (!rowId) return;

    const row = itemRowRefs.current.get(rowId);
    // The table layout's first field is the Tipo control; the mobile list focuses the description.
    const firstField = itemTypeRefs.current.get(rowId) ?? itemDescriptionRefs.current.get(rowId);
    if (!row || !firstField) return;

    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    firstField.focus({ preventScroll: true });
    pendingItemRowId.current = null;
  }, [sections]);

  React.useEffect(() => {
    if (!isCustomerListOpen) return;

    const positionList = () => {
      const input = customerInputRef.current;
      if (!input) return;
      const bounds = input.getBoundingClientRect();
      const listHeight = Math.min(customerListRef.current?.scrollHeight || customerListMaxHeight, customerListMaxHeight);
      const availableBelow = Math.max(0, window.innerHeight - bounds.bottom - customerListGap - customerListViewportMargin);
      const availableAbove = Math.max(0, bounds.top - customerListGap - customerListViewportMargin);
      const placeBelow = availableBelow >= listHeight || availableBelow >= availableAbove;
      const maxHeight = Math.min(
        customerListMaxHeight,
        placeBelow ? availableBelow : availableAbove,
        Math.max(0, window.innerHeight - customerListViewportMargin * 2),
      );
      const width = Math.min(bounds.width, Math.max(0, window.innerWidth - customerListViewportMargin * 2));
      const left = Math.min(
        Math.max(customerListViewportMargin, bounds.left),
        Math.max(customerListViewportMargin, window.innerWidth - customerListViewportMargin - width),
      );
      const preferredTop = placeBelow
        ? bounds.bottom + customerListGap
        : bounds.top - customerListGap - maxHeight;
      const top = Math.min(
        Math.max(customerListViewportMargin, preferredTop),
        Math.max(customerListViewportMargin, window.innerHeight - customerListViewportMargin - maxHeight),
      );
      setCustomerListPosition({ left, top, width, maxHeight });
    };
    const closeList = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!customerInputRef.current?.contains(target) && !customerListRef.current?.contains(target)) {
        setIsCustomerListOpen(false);
        setActiveCustomerIndex(-1);
      }
    };

    positionList();
    window.addEventListener("resize", positionList);
    window.addEventListener("scroll", positionList, true);
    document.addEventListener("pointerdown", closeList, true);
    return () => {
      window.removeEventListener("resize", positionList);
      window.removeEventListener("scroll", positionList, true);
      document.removeEventListener("pointerdown", closeList, true);
    };
  }, [isCustomerListOpen]);

  function selectCustomer(customer: CustomerOption) {
    selectSearchCustomer(customer);
    dispatch({ type: "setCustomerId", customerId: customer.id });
    const defaultFp = customer.fiscalProfiles?.find((fp) => fp.isDefault);
    if (defaultFp) {
      dispatch({ type: "setCustomerFiscalProfileId", customerFiscalProfileId: defaultFp.id });
    }
    setIsCustomerListOpen(false);
    setActiveCustomerIndex(-1);
    setStepError(null);
  }

  function handleCustomerSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (!isCustomerListOpen) return;
      event.stopPropagation();
      setIsCustomerListOpen(false);
      setActiveCustomerIndex(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsCustomerListOpen(true);
      setActiveCustomerIndex((current) => {
        if (!customerOptions.length) return -1;
        if (event.key === "ArrowDown") return current < customerOptions.length - 1 ? current + 1 : 0;
        return current > 0 ? current - 1 : customerOptions.length - 1;
      });
      return;
    }

    if (event.key === "Enter" && isCustomerListOpen && activeCustomerIndex >= 0) {
      const customer = customerOptions[activeCustomerIndex];
      if (customer) {
        event.preventDefault();
        selectCustomer(customer);
      }
    }
  }

  async function handleCreateCustomer() {
    if (!createCustomerAction) return;

    if (getMeaningfulTextError(newCustomerName, "nombre")) {
      setCreateCustomerError("Revisa el nombre del cliente.");
      return;
    }

    setCreateCustomerError(null);
    setCreateCustomerMessage(null);
    setIsCreatingCustomer(true);

    let result: QuoteCustomerActionResult;

    try {
      result = await createCustomerAction({
        name: newCustomerName,
        ...(newCustomerLegalName.trim() ? { legalName: newCustomerLegalName.trim() } : {}),
        email: newCustomerEmail,
        phone: newCustomerPhone,
        address: "",
        notes: "",
      });
    } catch {
      setCreateCustomerError("No se pudo crear el cliente. Intenta de nuevo.");
      setIsCreatingCustomer(false);
      return;
    }

    setIsCreatingCustomer(false);

    if (!result.success || !result.customer) {
      setCreateCustomerError("Revisa el nombre, correo o teléfono del cliente.");
      return;
    }

    const createdCustomer = result.customer;

    if (newCustomerContactName.trim() && createdCustomer.id) {
      try {
        const contactRes = await createCustomerContactAction(createdCustomer.id, {
          name: newCustomerContactName.trim(),
          phone: newCustomerContactPhone.trim() || undefined,
          role: "DRIVER",
          isActive: true,
        });
        if (contactRes.success && contactRes.contact) {
          createdCustomer.contacts = [contactRes.contact];
          dispatch({
            type: "setCustomerContactId",
            customerContactId: contactRes.contact.id,
          });
        }
      } catch {
        // Non-blocking fallback
      }
    }

    clearCustomerSearchCache();
    selectCustomer(createdCustomer);
    setNewCustomerName("");
    setNewCustomerLegalName("");
    setNewCustomerContactName("");
    setNewCustomerContactPhone("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setShowCreateCustomer(false);
    setStepError(null);
    setCreateCustomerMessage(
      result.reused ? "Cliente existente seleccionado." : "Cliente creado y seleccionado.",
    );
  }

  function dispatchItemsAction(action: QuoteBuilderItemsAction) {
    const addsFocusedRow = action.type === "addSection" || action.type === "addItem" || action.type === "duplicateItem";
    if (addsFocusedRow) {
      const rowId = selectNextItemRowId(builderState);
      pendingItemRowId.current = rowId;
      setAnimatedItemRowId(rowId);
      setExpandedItemRowId(rowId);
      setStepError(null);
    }

    const nextState = !addsFocusedRow && stepError
      ? quoteBuilderReducer(builderState, action)
      : null;
    dispatch(action);
    if (nextState) {
      setStepError(getStepError("items", {
        customerId: nextState.customerId,
        vehicle: nextState.vehicle,
        title: nextState.title,
        sections: nextState.sections,
      }));
    }
  }

  function toggleItem(rowId: string) {
    setExpandedItemRowId((current) => current === rowId ? null : rowId);
  }

  function goToNext() {
    if (step === "items") {
      const allItems = sections.flatMap((s) => s.items);
      const firstInvalidIndex = allItems.findIndex((item, index) => validateItemValue(item, index));

      if (firstInvalidIndex !== -1) {
        setStepError(null);
        return;
      }

      const normalizedSecs = normalizeSections(sections);

      if (normalizedSecs.length === 0 || normalizedSecs.every((s) => s.items.length === 0)) {
        setStepError("Ingresa al menos un concepto completo.");
        return;
      }

      if (isWorkshopDirect && isCompleted) {
        const hasMissingPrice = normalizedSecs.some((s) =>
          s.items.some((item) => !item.unitPrice || Number(item.unitPrice) < 0)
        );
        if (hasMissingPrice) {
          setStepError("Completa los precios válidos de todos los conceptos antes de finalizar el trabajo.");
          return;
        }
      }

      setStepError(null);
      dispatch({ type: "replaceSections", sections: normalizedSecs });
    } else {
      const error = isSale && step === "client" && !customerId
        ? "Selecciona un cliente para la venta."
        : getStepError(step, { customerId, vehicle, title, sections });

      if (error) {
        setStepError(error);
        return;
      }

      if (step === "client" && isWorkshopDirect && !masterId) {
        setStepError("El maestro responsable es obligatorio.");
        return;
      }

      if (step === "notes" && isWorkshopDirect && isSundayOperationalDate(operationalDate)) {
        setStepError("No se pueden registrar trabajos en domingo. Selecciona una fecha válida de lunes a sábado.");
        return;
      }

      setStepError(null);
    }

    const nextIndex = currentStepIndex + 1;

    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  }

  function goToPrevious() {
    setStepError(null);
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  }

  function validateFinalSubmit() {
    const itemError = sections
      .flatMap((section) => section.items)
      .map((item, index) => validateItemValue(item, index))
    .find(Boolean);

    if (itemError) {
      setStep("items");
      setStepError(null);
      return false;
    }

    const clientError = isSale && !customerId
      ? "Selecciona un cliente para la venta."
      : getStepError("client", { customerId, vehicle, title, sections });
    const itemsError = getStepError("items", { customerId, vehicle, title, sections });
    const notesError = getStepError("notes", { customerId, vehicle, title, sections });
    const error = clientError ?? itemsError ?? notesError;

    if (error) {
      setStepError(error);
      return false;
    }

    if (isWorkshopDirect && isSundayOperationalDate(operationalDate)) {
      setStep("notes");
      setStepError("No se pueden registrar trabajos en domingo. Selecciona una fecha válida de lunes a sábado.");
      return false;
    }

    if (isWorkshopDirect) {
      if (!masterId) {
        setStep("client");
        setStepError("El maestro responsable es obligatorio.");
        return false;
      }

      if (isCompleted) {
        const normalizedSecs = normalizeSections(sections);
        const hasMissingPrice = normalizedSecs.some((s) =>
          s.items.some((item) => !item.unitPrice || Number(item.unitPrice) < 0)
        );
        if (hasMissingPrice) {
          setStep("items");
          setStepError("Completa los precios válidos de todos los conceptos antes de finalizar el trabajo.");
          return false;
        }
      }
    }

    setStepError(null);
    return true;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const submittedByFinalAction = (event.nativeEvent as SubmitEvent).submitter === submitButtonRef.current;

    if (step !== "preview" || !submittedByFinalAction || !hasExplicitSubmitRequest.current || isSubmitting) {
      event.preventDefault();
      return;
    }

    hasExplicitSubmitRequest.current = false;

    if (!validateFinalSubmit()) {
      event.preventDefault();
    }
  }

  const isDialogLayout = layout === "dialog";
  // The provider flips its host state from the slot ref callbacks, so this
  // context value changes exactly when a host attaches or detaches. The
  // consumer re-renders the portals reactively, without any effect that could
  // miss the late-attached footer host.
  const chromeHosts = React.useContext(QuoteBuilderChromeContext);
  // Unique per instance: the footer is rendered outside the form in the dialog
  // layout, so the submit button associates back to its form by id.
  const formId = React.useId();
  const formClass = isDialogLayout
    ? "min-h-0 min-w-0"
    : "flex flex-col";
  const scrollAreaClass = isDialogLayout
    ? "min-h-0 min-w-0"
    : "py-4 pr-1";
  const stepperContent = fullScreen
    ? <QuoteBuilderProgress current={step} onChange={setStep} />
    : <QuoteBuilderStepper current={step} onChange={setStep} />;
  const subtitleContent = fullScreen
    ? <p className="truncate text-xs text-[var(--color-text-muted)]">{`Paso ${currentStepIndex + 1} de ${steps.length} · ${flowStepLabels[step]}`}</p>
    : null;
  const nextStep = steps[currentStepIndex + 1];
  const submitButton = (
    <Button
      ref={submitButtonRef}
      type="submit"
      variant="primary"
      size={fullScreen ? "default" : undefined}
      loading={isSubmitting}
      form={formId}
      onClick={() => {
        hasExplicitSubmitRequest.current = true;
      }}
      className={fullScreen ? undefined : "min-w-[160px]"}
      aria-live="polite"
    >
      {isSubmitting
        ? (isEdit ? "Guardando..." : "Creando...")
        : isEdit
          ? "Guardar cambios"
        : isSaleNote || mode === "direct-note"
            ? "Crear nota"
        : mode === "direct-work-order" || mode === "direct"
              ? "Crear trabajo"
              : "Crear cotización"}
    </Button>
  );
  const footerContent = fullScreen ? (
    <>
      {step === "items" || step === "notes" ? (
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{taxEnabled ? "Total con IVA" : "Total"}</span>
          <span data-testid="quote-builder-footer-total" className="text-[22px] font-bold leading-tight tabular-nums text-[var(--color-amount)]">
            {formatCents(totalCents)}
          </span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">{`Paso ${currentStepIndex + 1} de ${steps.length}`}</span>
          <span className="truncate text-sm font-semibold text-[var(--color-text-main)]">{flowStepLabels[step]}</span>
        </div>
      )}
      {step === "preview" ? submitButton : (
        <Button type="button" variant="primary" size="default" onClick={goToNext}>
          {`${flowStepLabels[nextStep]} →`}
        </Button>
      )}
    </>
  ) : (
    <>
      <div className="flex items-center gap-2">
        {step !== "client" ? (
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevious}
            className="min-w-[96px]"
          >
            Anterior
          </Button>
        ) : null}
      </div>

      {step === "preview" ? submitButton : (
        <Button
          type="button"
          variant="primary"
          onClick={goToNext}
          className="min-w-[140px]"
        >
          Siguiente
        </Button>
      )}
    </>
  );
  // ← steps back and is disabled on the first step; ✕ (in the shell) is the only way out.
  const leadingContent = (
    <button
      type="button"
      onClick={goToPrevious}
      disabled={currentStepIndex === 0}
      aria-label="Paso anterior"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon name="chevron-left" className="h-5 w-5" aria-hidden="true" />
    </button>
  );
  const shouldPortalChrome =
    isDialogLayout &&
    chromeHosts != null &&
    chromeHosts.stepperHost != null &&
    chromeHosts.footerHost != null &&
    (!fullScreen || (chromeHosts.leadingHost != null && chromeHosts.subtitleHost != null));

  return (
    <>
    <form
      ref={formRef}
      id={formId}
      action={formAction}
      className={formClass}
      data-testid="quote-builder-form"
      data-layout={layout}
      style={isDialogLayout ? {
        alignItems: "stretch",
         display: "flex",
         flexDirection: "column",
        justifyContent: "flex-start",
        minHeight: 0,
        minWidth: 0,
      } : undefined}
      onSubmit={handleSubmit}
    >
          {isDialogLayout ? null : (
          <div className="shrink-0 border-b border-[var(--color-border-light)] pb-4">
            {stepperContent}
          </div>
          )}

          <div
            ref={scrollAreaRef}
            className={scrollAreaClass}
            data-testid="quote-builder-scroll-area"
          >
            <div className="grid content-start gap-6">
          {isUnifiedDirect || mode === "quote" ? (
            <>
              <input type="hidden" name="operation" value={operation} />
              {isWorkshopDirect ? <input type="hidden" name="masterId" value={masterId} /> : null}
              {isWorkshopDirect ? <input type="hidden" name="isCompleted" value={isCompleted ? "true" : "false"} /> : null}
              {paymentDueDate ? <input type="hidden" name="paymentDueDate" value={paymentDueDate} /> : null}
            </>
          ) : null}

          {stepError ? (
            <p
              className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]"
              role="alert"
            >
              {stepError}
            </p>
          ) : null}
          {actionState.error ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              {actionState.error}
            </p>
          ) : null}

          {/* Step 1: Cliente / Unidad */}
          <section hidden={step !== "client"} className="grid gap-4">
            <h2 className="sr-only" tabIndex={-1} data-step-heading="client">
              Cliente y unidad
            </h2>
            {isUnifiedDirect || mode === "quote" ? (
              <SegmentedControl
                label="Tipo de operación"
                fullWidth
                options={[
                  { value: "WORK", label: "Trabajo de taller" },
                  { value: "SALE", label: "Venta" },
                ]}
                value={operation}
                onValueChange={(value) => changeOperation(value as "WORK" | "SALE")}
              />
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="customerId">Cliente</Label>
              <input type="hidden" name="customerId" value={customerId} />
              <input type="hidden" name="customerContactId" value={customerContactId} />
              <input type="hidden" name="customerFiscalProfileId" value={customerFiscalProfileId} />
              <div className="relative">
                <span data-testid="customer-search-icon" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                  <Icon name="search" className="h-4 w-4" aria-hidden="true" />
                </span>
              <Input
                ref={customerInputRef}
                id="customerId"
                className="pl-9 focus-visible:ring-inset"
                role="combobox"
                aria-controls="customer-results"
                aria-expanded={isCustomerListOpen}
                aria-activedescendant={
                  isCustomerListOpen && activeCustomerIndex >= 0
                    ? `customer-option-${customerOptions[activeCustomerIndex]?.id}`
                    : undefined
                }
                aria-autocomplete="list"
                autoComplete="off"
                value={customerSearch}
                onChange={(event) => {
                  const nextSearch = event.target.value;
                  const nextOptions = updateCustomerSearch(nextSearch);
                  dispatch({ type: "setCustomerId", customerId: "" });
                  setIsCustomerListOpen(true);
                  setActiveCustomerIndex(nextOptions.length ? 0 : -1);
                }}
                onFocus={() => setIsCustomerListOpen(true)}
                onClick={() => setIsCustomerListOpen(true)}
                onKeyDown={handleCustomerSearchKeyDown}
                placeholder="Nombre, teléfono o placas"
              />
              </div>
              {isSearchingCustomers ? <p className="text-sm text-[var(--color-text-muted)]" role="status">Buscando clientes...</p> : null}
              {customerSearchError ? <p className="text-sm text-[var(--color-status-danger-fg)]" role="alert">{customerSearchError}</p> : null}
              {isCustomerListOpen && !customerSearchError ? createPortal(
                <div ref={customerListRef} id="customer-results" role="listbox" aria-label="Resultados de clientes" data-dialog-popover style={{ ...customerListPosition, pointerEvents: "auto" }} className="fixed z-[60] overflow-y-auto overscroll-contain touch-pan-y rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1 shadow-lg">
                  {customerOptions.length ? customerOptions.map((customer) => (
                    <button
                      key={customer.id}
                      id={`customer-option-${customer.id}`}
                      type="button"
                      role="option"
                      aria-selected={customerOptions[activeCustomerIndex]?.id === customer.id}
                      className={`flex min-h-11 w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)] ${customerOptions[activeCustomerIndex]?.id === customer.id ? "bg-[var(--color-bg-soft)]" : ""}`}
                      onMouseEnter={() => setActiveCustomerIndex(customerOptions.indexOf(customer))}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => selectCustomer(customer)}
                    >
                      {customer.name}
                    </button>
                  )) : <p className="px-3 py-4 text-center text-sm text-[var(--color-text-muted)]">No se encontraron clientes.</p>}
                </div>,
                document.body,
              ) : null}
              {selectedCustomer ? (
                <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Cliente seleccionado: <strong className="text-[var(--color-text-main)]">{selectedCustomer.name}</strong>
                    </p>
                    {selectedCustomer.legalName ? (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Razón social: {selectedCustomer.legalName}
                      </p>
                    ) : null}
                  </div>

                  {selectedCustomer.contacts && selectedCustomer.contacts.length > 0 ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="quoteCustomerContact" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Contacto operativo / Chofer (opcional)
                      </Label>
                      <Select
                        value={customerContactId || "none"}
                        onValueChange={(value) =>
                          dispatch({
                            type: "setCustomerContactId",
                            customerContactId: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger id="quoteCustomerContact" className="bg-[var(--color-surface)]">
                          <SelectValue placeholder="Sin contacto específico asignado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin contacto asignado</SelectItem>
                          {selectedCustomer.contacts
                            .filter((c) => c.isActive || c.id === customerContactId)
                            .map((c) => {
                              const roleBadge = formatQuoteContactRole(c.role) || "Contacto";
                              return (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} ({roleBadge}{c.phone ? ` · ${c.phone}` : ""})
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-light)] p-2.5 text-xs text-[var(--color-text-muted)]">
                      <span>Sin choferes o contactos registrados aún para este cliente.</span>
                    </div>
                  )}

                  {selectedCustomer.fiscalProfiles && selectedCustomer.fiscalProfiles.length > 0 ? (
                    <div className="grid gap-1.5">
                      <Label htmlFor="quoteCustomerFiscalProfile" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                        Razón social / Perfil fiscal (opcional)
                      </Label>
                      <Select
                        value={customerFiscalProfileId || "none"}
                        onValueChange={(value) =>
                          dispatch({
                            type: "setCustomerFiscalProfileId",
                            customerFiscalProfileId: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger id="quoteCustomerFiscalProfile" className="bg-[var(--color-surface)]">
                          <SelectValue placeholder="Sin perfil fiscal específico" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin perfil fiscal específico</SelectItem>
                          {selectedCustomer.fiscalProfiles.map((fp) => (
                            <SelectItem key={fp.id} value={fp.id}>
                              {fp.businessName} ({fp.taxId}){fp.isDefault ? " · Predeterminado" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {createCustomerAction ? (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomer(true)}
                    className="justify-self-start rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    + Crear cliente nuevo
                  </button>
                  {createCustomerMessage ? (
                    <p className="text-sm text-[var(--color-status-success-fg)]" role="status">
                      {createCustomerMessage}
                    </p>
                  ) : null}
                  <Sheet open={showCreateCustomer} onOpenChange={setShowCreateCustomer}>
                    <DialogMobileContent variant="sheet" aria-describedby={undefined}>
                      <DialogMobileHeader>
                        <DialogTitle>Crear cliente nuevo</DialogTitle>
                      </DialogMobileHeader>
                      <DialogMobileBody>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="quoteCustomerName">Nombre</Label>
                            <Input
                              id="quoteCustomerName"
                              value={newCustomerName}
                              onChange={(event) => setNewCustomerName(event.target.value)}
                              placeholder="Ej. Juan Pérez o Grúas Mejía"
                              required
                              aria-describedby={newCustomerNameError ? "quote-customer-name-error" : undefined}
                              aria-invalid={newCustomerNameError ? true : undefined}
                            />
                            <span id="quote-customer-name-error" role={newCustomerNameError ? "alert" : undefined} className="min-h-4 text-xs text-[var(--color-status-danger-fg)]">
                              {newCustomerNameError}
                            </span>
                          </div>
                          <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="quoteCustomerLegalName">Razón social formal (opcional)</Label>
                            <Input
                              id="quoteCustomerLegalName"
                              value={newCustomerLegalName}
                              onChange={(event) => setNewCustomerLegalName(event.target.value)}
                              placeholder="Ej. Grúas Mejía Cuautla S.A. de C.V."
                            />
                          </div>
                          <div className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-2.5 sm:col-span-2 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                              <Label htmlFor="quoteCustomerContactName" className="text-xs">
                                Chofer u operador inicial (opcional)
                              </Label>
                              <Input
                                id="quoteCustomerContactName"
                                value={newCustomerContactName}
                                onChange={(event) => setNewCustomerContactName(event.target.value)}
                                placeholder="Ej. El Mariachi / Juanito"
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor="quoteCustomerContactPhone" className="text-xs">
                                Teléfono del chofer (opcional)
                              </Label>
                              <Input
                                id="quoteCustomerContactPhone"
                                type="tel"
                                inputMode="tel"
                                maxLength={20}
                                value={newCustomerContactPhone}
                                onChange={(event) => setNewCustomerContactPhone(event.target.value)}
                                placeholder="55 1234 5678"
                              />
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="quoteCustomerEmail">Correo electrónico</Label>
                            <Input
                              id="quoteCustomerEmail"
                              type="email"
                              value={newCustomerEmail}
                              onChange={(event) => setNewCustomerEmail(event.target.value)}
                              placeholder="cliente@ejemplo.com"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="quoteCustomerPhone">Teléfono</Label>
                            <Input
                              id="quoteCustomerPhone"
                              type="tel"
                              inputMode="tel"
                              maxLength={20}
                              value={newCustomerPhone}
                              onChange={(event) => setNewCustomerPhone(event.target.value)}
                              placeholder="55 1234 5678"
                            />
                          </div>
                          {createCustomerError ? (
                            <p className="text-sm text-[var(--color-status-danger-fg)] sm:col-span-2" role="alert">
                              {createCustomerError}
                            </p>
                          ) : null}
                        </div>
                      </DialogMobileBody>
                      <DialogMobileFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCreateCustomer(false)}>
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          loading={isCreatingCustomer}
                          disabled={newCustomerName.trim() === "" || Boolean(newCustomerNameError)}
                          onClick={handleCreateCustomer}
                        >
                          Guardar y seleccionar
                        </Button>
                      </DialogMobileFooter>
                    </DialogMobileContent>
                  </Sheet>
                </div>
              ) : null}
            </div>

            {isWorkshopDirect ? (
              <div className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4">
                <div className="grid gap-2">
                  <Label htmlFor="masterId">Maestro responsable *</Label>
                  <Select
                    value={masterId}
                    onValueChange={(val) => {
                      setMasterId(val);
                      setStepError(null);
                    }}
                  >
                    <SelectTrigger id="masterId">
                      <SelectValue placeholder="Selecciona un maestro" />
                    </SelectTrigger>
                    <SelectContent>
                      {masters.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Checkbox
                    id="isCompleted"
                    label="Trabajo finalizado"
                    checked={isCompleted}
                    onCheckedChange={(checked) => setIsCompleted(checked === true)}
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Si se marca como finalizado, todos los conceptos deben tener precio y pasará directamente a Notas.
                  </p>
                </div>
              </div>
            ) : null}

            {!isSaleNote ? <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium text-[var(--color-text-main)]">Vehículo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="plate">Placas (opcional)</Label>
                  <Input
                    id="plate"
                    name="plate"
                    maxLength={10}
                    placeholder="Ej. ABC-123"
                    value={vehicle.plate}
                    onChange={(event) => dispatch({ type: "setVehicleField", field: "plate", value: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="economicNumber">ECO (opcional)</Label>
                  <Input
                    id="economicNumber"
                    name="economicNumber"
                    maxLength={30}
                    value={vehicle.economicNumber}
                    onChange={(event) => dispatch({ type: "setVehicleField", field: "economicNumber", value: event.target.value })}
                    placeholder="Ej. 42"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Marca (opcional)</Label>
                  <Input
                    id="brand"
                    name="brand"
                    placeholder="Ej. Ford"
                    value={vehicle.brand}
                    onChange={(event) => dispatch({ type: "setVehicleField", field: "brand", value: event.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Modelo (opcional)</Label>
                  <Input
                    id="model"
                    name="model"
                    placeholder="Ej. F-350"
                    value={vehicle.model}
                    onChange={(event) => dispatch({ type: "setVehicleField", field: "model", value: event.target.value })}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="year">Año (opcional)</Label>
                  <Input
                    id="year"
                    name="year"
                    placeholder="Ej. 2015"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    value={vehicle.year}
                    onChange={(event) => dispatch({ type: "setVehicleField", field: "year", value: event.target.value })}
                  />
                </div>
              </div>
            </div> : null}
          </section>

          {/* Step 2: Conceptos */}
          <div hidden={step !== "items"}>
            <h2 className="sr-only" tabIndex={-1} data-step-heading="items">
              Conceptos
            </h2>
            <QuoteBuilderItemsStep
              state={{ sections, taxEnabled, discount }}
              summary={{ completeItemsCount, subtotalCents, discountCents, taxCents, totalCents }}
              dispatch={dispatchItemsAction}
              focus={{
                animatedRowId: animatedItemRowId,
                expandedItemRowId,
                onToggleItem: toggleItem,
                onRowRef: (rowId, node) => {
                  if (node) itemRowRefs.current.set(rowId, node);
                  else itemRowRefs.current.delete(rowId);
                },
                onTypeRef: (rowId, node) => {
                  if (node) itemTypeRefs.current.set(rowId, node);
                  else itemTypeRefs.current.delete(rowId);
                },
                onDescriptionRef: (rowId, node) => {
                  if (node) itemDescriptionRefs.current.set(rowId, node);
                  else itemDescriptionRefs.current.delete(rowId);
                },
              }}
              allowedItemTypes={isSale ? ["MATERIAL", "REFACCIONES"] : undefined}
            />
          </div>

          {/* Step 3: Notas */}
          <section hidden={step !== "notes"} className="grid gap-4">
            <h2 className="sr-only" tabIndex={-1} data-step-heading="notes">
              Notas
            </h2>
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  dispatch({ type: "setTitle", title: nextTitle });
                  setStepError((current) =>
                    current
                      ? getStepError("notes", { customerId, vehicle, title: nextTitle, sections })
                      : null,
                  );
                }}
                placeholder="Ej. Servicio general"
                aria-describedby={titleError ? "quote-title-error" : undefined}
                aria-invalid={titleError ? true : undefined}
              />
              <span id="quote-title-error" role={titleError ? "alert" : undefined} className="min-h-4 text-xs text-[var(--color-status-danger-fg)]">
                {titleError}
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="operationalDate">
                {isSaleNote || mode === "direct-note" ? "Fecha de la nota" : mode === "direct-work-order" || mode === "direct" ? "Fecha del trabajo" : "Fecha de cotización"}
              </Label>
              <Input
                id="operationalDate"
                name={isOperationalDateEditable ? "operationalDate" : undefined}
                type="date"
                max={mexicoCityCalendarDate()}
                value={operationalDate}
                disabled={!isOperationalDateEditable}
                onChange={(event) => dispatch({ type: "setOperationalDate", operationalDate: event.target.value })}
              />
              {!isOperationalDateEditable ? <input type="hidden" name="operationalDate" value={operationalDate} /> : null}
              {isWorkshopDirect && isSundayOperationalDate(operationalDate) && (
                <p className="text-xs font-medium text-[var(--color-status-danger-fg)]" role="alert">
                  No se pueden registrar trabajos en domingo. Selecciona una fecha de lunes a sábado.
                </p>
              )}
            </div>
            {isSaleNote || mode === "direct-note" ? (
              <div className="grid gap-2">
                <Label htmlFor="paymentDueDate">Fecha de vencimiento de pago (opcional)</Label>
                <Input
                  id="paymentDueDate"
                  type="date"
                  value={paymentDueDate}
                  onChange={(event) => setPaymentDueDate(event.target.value)}
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(event) => dispatch({ type: "setDescription", description: event.target.value })}
                placeholder={isSaleNote || mode === "direct-note" ? "Detalles adicionales de la nota..." : mode === "direct-work-order" || mode === "direct" ? "Detalles adicionales del trabajo..." : "Detalles adicionales de la cotización..."}
              />
            </div>
            <Switch
              name="administrative"
              label="Cotización administrativa"
              checked={administrative}
              onCheckedChange={(checked) => dispatch({ type: "setAdministrative", administrative: checked === true })}
            />
          </section>

          {/* Step 4: Review and submit */}
          <section hidden={step !== "preview"} className="grid gap-4">
            <h2 className="sr-only" tabIndex={-1} data-step-heading="preview">
              {isSaleNote || mode === "direct-note" ? "Revisar y confirmar nota" : mode === "direct-work-order" || mode === "direct" ? "Revisar y confirmar trabajo" : "Revisar y enviar cotización"}
            </h2>
            {(() => {
              const selectedContact = selectedCustomer?.contacts?.find((c) => c.id === customerContactId);
              const selectedFiscal = selectedCustomer?.fiscalProfiles?.find((fp) => fp.id === customerFiscalProfileId);
              const customerDisplayName = selectedCustomer?.commercialName || selectedCustomer?.name || "";
              const legalDisplayName =
                selectedFiscal?.businessName ||
                selectedCustomer?.legalName ||
                (selectedCustomer?.commercialName ? selectedCustomer?.name : null);
              const contactRoleBadge = selectedContact
                ? formatQuoteContactRole(selectedContact.role)
                : null;

              const previewProps: QuotePreviewCardProps = {
                customerName: customerDisplayName,
                legalName: legalDisplayName,
                contactName: selectedContact?.name,
                contactRole: contactRoleBadge,
                vehicle,
                title,
                description,
                administrative,
                sections,
                subtotalCents,
                discountCents,
                taxCents,
                totalCents,
                validUntil,
              };
              const typeLabel = isSaleNote || mode === "direct-note" ? "Nota" : mode === "direct-work-order" || mode === "direct" ? "Trabajo" : "Cotización";
              return (
                <DocumentPreview
                  {...toDocumentPreviewProps(previewProps, { typeLabel, statusLabel: quoteStatusLabels.DRAFT })}
                />
              );
            })()}
          </section>
            </div>
          </div>

          {isDialogLayout ? null : (
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] bg-[var(--color-surface)] pt-4"
            data-testid="quote-builder-footer"
          >
            {footerContent}
          </div>
          )}
    </form>
    {shouldPortalChrome && chromeHosts ? (
      <>
        {fullScreen ? createPortal(leadingContent, chromeHosts.leadingHost!) : null}
        {fullScreen ? createPortal(subtitleContent, chromeHosts.subtitleHost!) : null}
        {createPortal(stepperContent, chromeHosts.stepperHost!)}
        {createPortal(footerContent, chromeHosts.footerHost!)}
      </>
    ) : null}
    </>
  );
}
