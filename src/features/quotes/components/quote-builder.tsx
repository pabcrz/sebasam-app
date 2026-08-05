"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { createQuoteValidUntil } from "@/features/quotes/lib/calculate";
import {
  calculateTotals,
  emptyItem,
  getStepError,
  isItemComplete,
  normalizeItems,
  ItemFormValue,
  getMaxQuantityForType,
  Step,
  steps,
  validateItemValue,
} from "./quote-builder-shared";
import { QuoteBuilderItemsStep } from "./quote-builder-items-step";
import { QuoteBuilderStepper } from "./quote-builder-stepper";
import { QuotePreviewCard } from "./quote-preview-card";
import { QuoteSummaryCard } from "./quote-summary-card";
import type { QuoteFormActionState } from "../actions";

export type CustomerOption = {
  id: string;
  name: string;
};

const customerSearchDelay = 500;
const minimumCustomerQueryLength = 2;
const customerListGap = 4;
const customerListViewportMargin = 8;
const customerListMaxHeight = 224;

function filterCustomers(customers: CustomerOption[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
  if (!normalizedQuery) return customers;
  return customers.filter((customer) => customer.name.toLocaleLowerCase("es-MX").includes(normalizedQuery));
}

type QuoteCustomerActionResult = {
  success: boolean;
  customer?: CustomerOption;
  error?: string;
  reused?: boolean;
};

export type QuoteBuilderInitialData = {
  customerId: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  taxEnabled: boolean;
  items: ItemFormValue[];
};

type QuoteBuilderProps = {
  customers: CustomerOption[];
  createAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  saveAction?: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  createCustomerAction?: (input: unknown) => Promise<QuoteCustomerActionResult>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
  initialData?: QuoteBuilderInitialData;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSuccess?: () => void;
  layout?: "page" | "dialog";
};

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
}: QuoteBuilderProps) {
  const isEdit = saveAction != null;
  const action = saveAction ?? createAction;
  const [actionState, formAction, isSubmitting] = React.useActionState(
    async (state: QuoteFormActionState, formData: FormData) => (await action?.(state, formData)) ?? {},
    {},
  );
  const initialSelectedCustomer = customers.find((customer) => customer.id === initialData?.customerId);
  const [customerOptions, setCustomerOptions] = React.useState<CustomerOption[]>(customers);
  const [customerSearch, setCustomerSearch] = React.useState(initialSelectedCustomer?.name ?? "");
  const [customerSearchError, setCustomerSearchError] = React.useState<string | null>(null);
  const [isSearchingCustomers, setIsSearchingCustomers] = React.useState(false);
  const [isCustomerListOpen, setIsCustomerListOpen] = React.useState(false);
  const [activeCustomerIndex, setActiveCustomerIndex] = React.useState(-1);
  const customerSearchRequest = React.useRef(0);
  const selectedCustomerRef = React.useRef<CustomerOption | undefined>(initialSelectedCustomer);
  const customerInputRef = React.useRef<HTMLInputElement>(null);
  const customerListRef = React.useRef<HTMLDivElement>(null);
  const knownCustomersRef = React.useRef(new Map(customers.map((customer) => [customer.id, customer])));
  const customerQueryCache = React.useRef(new Map<string, CustomerOption[]>());
  const [customerListPosition, setCustomerListPosition] = React.useState<React.CSSProperties>({});
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const hasChangedStep = React.useRef(false);
  const [step, setStep] = React.useState<Step>("client");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [showItemValidation, setShowItemValidation] = React.useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState("");
  const [newCustomerEmail, setNewCustomerEmail] = React.useState("");
  const [newCustomerPhone, setNewCustomerPhone] = React.useState("");
  const [createCustomerMessage, setCreateCustomerMessage] = React.useState<string | null>(null);
  const [createCustomerError, setCreateCustomerError] = React.useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = React.useState(false);
  const [customerId, setCustomerId] = React.useState(initialData?.customerId ?? "");
  const [vehicle, setVehicle] = React.useState(
    initialData?.vehicle ?? { plate: "", brand: "", model: "", year: "" },
  );
  const [title, setTitle] = React.useState(initialData?.title ?? "");
  const [description, setDescription] = React.useState(initialData?.description ?? "");
  const [administrative, setAdministrative] = React.useState(initialData?.administrative ?? false);
  const [taxEnabled, setTaxEnabled] = React.useState(initialData?.taxEnabled ?? true);
  const initialItemCount = initialData?.items.length || 1;
  const nextItemRowId = React.useRef(initialItemCount);
  const [items, setItems] = React.useState<ItemFormValue[]>(() =>
    initialData?.items.length ? initialData.items : [{ ...emptyItem }],
  );
  const [itemRowIds, setItemRowIds] = React.useState(() =>
    Array.from({ length: initialItemCount }, (_, index) => `quote-item-${index}`),
  );
  const [animatedItemRowId, setAnimatedItemRowId] = React.useState<string | null>(null);
  const pendingItemRowId = React.useRef<string | null>(null);
  const itemRowRefs = React.useRef(new Map<string, HTMLDivElement>());
  const itemDescriptionRefs = React.useRef(new Map<string, HTMLInputElement>());
  const initialFormState = React.useRef(JSON.stringify({
    customerId: initialData?.customerId ?? "",
    customerSearch: initialSelectedCustomer?.name ?? "",
    vehicle: initialData?.vehicle ?? { plate: "", brand: "", model: "", year: "" },
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    administrative: initialData?.administrative ?? false,
    taxEnabled: initialData?.taxEnabled ?? true,
    items: initialData?.items.length ? initialData.items : [{ ...emptyItem }],
    newCustomer: ["", "", ""],
  }));

  const currentStepIndex = steps.indexOf(step);
  const { subtotalCents, taxCents, totalCents } = calculateTotals(items, taxEnabled);
  const selectedCustomer = customerOptions.find((customer) => customer.id === customerId);
  const completeItems = items.filter(isItemComplete);
  const validUntil = createQuoteValidUntil();

  React.useEffect(() => {
    if (actionState.success) onSuccess?.();
  }, [actionState.success, onSuccess]);

  React.useEffect(() => {
    const current = JSON.stringify({ customerId, customerSearch, vehicle, title, description, administrative, taxEnabled, items, newCustomer: [newCustomerName, newCustomerEmail, newCustomerPhone] });
    onDirtyChange?.(current !== initialFormState.current);
  }, [administrative, customerId, customerSearch, description, items, newCustomerEmail, newCustomerName, newCustomerPhone, onDirtyChange, taxEnabled, title, vehicle]);

  React.useEffect(() => {
    if (!hasChangedStep.current) {
      hasChangedStep.current = true;
      return;
    }

    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
    const activeHeading = scrollAreaRef.current?.querySelector<HTMLElement>(
      `[data-step-heading="${step}"]`,
    );
    activeHeading?.focus({ preventScroll: true });
  }, [step]);

  React.useEffect(() => {
    const rowId = pendingItemRowId.current;
    if (!rowId) return;

    const row = itemRowRefs.current.get(rowId);
    const description = itemDescriptionRefs.current.get(rowId);
    if (!row || !description) return;

    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    description.focus({ preventScroll: true });
    pendingItemRowId.current = null;
  }, [itemRowIds]);

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

  React.useEffect(() => {
    const query = customerSearch.trim().toLocaleLowerCase("es-MX");
    if (!searchCustomersAction || customerSearch === selectedCustomer?.name || query.length < minimumCustomerQueryLength) {
      return;
    }

    if (customerQueryCache.current.has(query)) return;

    const requestId = ++customerSearchRequest.current;
    const timeout = window.setTimeout(async () => {
      setIsSearchingCustomers(true);
      setCustomerSearchError(null);

      try {
        const results = await searchCustomersAction({ query: customerSearch });
        if (requestId === customerSearchRequest.current) {
          results.forEach((customer) => knownCustomersRef.current.set(customer.id, customer));
          customerQueryCache.current.set(query, results);
          const selected = selectedCustomerRef.current;
          setCustomerOptions(
            selected && !results.some((customer) => customer.id === selected.id)
              ? [selected, ...results]
              : results,
          );
          setActiveCustomerIndex(results.length ? 0 : -1);
        }
      } catch {
        if (requestId === customerSearchRequest.current) {
          setCustomerSearchError("No se pudo buscar clientes. Intenta de nuevo.");
        }
      } finally {
        if (requestId === customerSearchRequest.current) setIsSearchingCustomers(false);
      }
    }, customerSearchDelay);

    return () => window.clearTimeout(timeout);
  }, [customerSearch, searchCustomersAction, selectedCustomer?.name]);

  function selectCustomer(customer: CustomerOption) {
    customerSearchRequest.current += 1;
    selectedCustomerRef.current = customer;
    knownCustomersRef.current.set(customer.id, customer);
    setCustomerOptions((current) =>
      current.some((option) => option.id === customer.id) ? current : [customer, ...current],
    );
    setCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setCustomerSearchError(null);
    setIsSearchingCustomers(false);
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

    setCreateCustomerError(null);
    setCreateCustomerMessage(null);
    setIsCreatingCustomer(true);

    let result: QuoteCustomerActionResult;

    try {
      result = await createCustomerAction({
        name: newCustomerName,
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

    customerQueryCache.current.clear();
    selectCustomer(createdCustomer);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setShowCreateCustomer(false);
    setStepError(null);
    setCreateCustomerMessage(
      result.reused ? "Cliente existente seleccionado." : "Cliente creado y seleccionado.",
    );
  }

  function addItem(type: ItemFormValue["type"]) {
    const firstInvalidIndex = items.findIndex((item, index) => validateItemValue(item, index));

    if (firstInvalidIndex !== -1) {
      setShowItemValidation(true);
      return;
    }

    setShowItemValidation(false);
    setStepError(null);
    const rowId = `quote-item-${nextItemRowId.current++}`;
    pendingItemRowId.current = rowId;
    setAnimatedItemRowId(rowId);
    setItemRowIds((current) => [...current, rowId]);
    setItems((prev) => [...prev, { ...emptyItem, type }]);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    setItemRowIds((current) => current.filter((_, i) => i !== index));
    setStepError((current) =>
      current ? getStepError("items", { customerId, vehicle, title, items: next }) : null,
    );
  }

  function updateItem(index: number, patch: Partial<ItemFormValue>) {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
    setStepError((current) =>
      current ? getStepError("items", { customerId, vehicle, title, items: next }) : null,
    );
  }

  function adjustItemQuantity(index: number, delta: number) {
    const next = [...items];
    const currentQuantity = Number(next[index]?.quantity);
    const baseQuantity = Number.isFinite(currentQuantity) ? currentQuantity : 0;
    const limit = getMaxQuantityForType(next[index]?.type ?? "LABOR");
    const nextQuantity = Math.min(limit, Math.max(1, baseQuantity + delta));
    next[index] = { ...next[index], quantity: String(nextQuantity) };
    setItems(next);
    setStepError((current) =>
      current ? getStepError("items", { customerId, vehicle, title, items: next }) : null,
    );
  }

  function duplicateItem(index: number) {
    const firstInvalidIndex = items.findIndex((item, index) => validateItemValue(item, index));

    if (firstInvalidIndex !== -1) {
      setShowItemValidation(true);
      return;
    }

    setShowItemValidation(false);
    setStepError(null);
    const rowId = `quote-item-${nextItemRowId.current++}`;
    pendingItemRowId.current = rowId;
    setAnimatedItemRowId(rowId);
    setItemRowIds((current) => {
      const next = [...current];
      next.splice(index + 1, 0, rowId);
      return next;
    });
    setItems((prev) => {
      const source = prev[index];
      if (!source) return prev;

      const duplicated: ItemFormValue = {
        type: source.type,
        description: source.description,
        quantity: source.quantity,
        unitPrice: source.unitPrice,
      };

      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  }

  function goToNext() {
    if (step === "items") {
      const normalizedItems = normalizeItems(items);
      const firstInvalidIndex = normalizedItems.findIndex((item, index) => validateItemValue(item, index));

      if (firstInvalidIndex !== -1) {
        setShowItemValidation(true);
        setStepError(null);
        return;
      }

      if (normalizedItems.length === 0) {
        setStepError("Ingresa al menos un concepto completo.");
        setShowItemValidation(false);
        return;
      }

      setShowItemValidation(false);
      setStepError(null);
      setItemRowIds((current) =>
        current.filter((_, index) => normalizedItems.includes(items[index]!)),
      );
      setItems(normalizedItems);
    } else {
      const error = getStepError(step, { customerId, vehicle, title, items });

      if (error) {
        setStepError(error);
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
    setShowItemValidation(false);
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  }

  const isDialogLayout = layout === "dialog";
  const formClass = isDialogLayout
    ? "min-h-0"
    : "flex flex-col";
  const scrollAreaClass = isDialogLayout
    ? "min-h-0 py-4 pr-1"
    : "py-4 pr-1";

  return (
    <form
      action={formAction}
      className={formClass}
      data-testid="quote-builder-form"
      data-layout={layout}
      style={isDialogLayout ? {
        alignItems: "stretch",
        display: "flex",
        flex: "1 1 0%",
        flexDirection: "column",
        justifyContent: "flex-start",
        minHeight: 0,
      } : undefined}
      onSubmit={(event) => {
        if (step !== "preview") {
          event.preventDefault();
          setStepError("Avanza al último paso antes de enviar la cotización.");
        } else {
          setItems((current) => normalizeItems(current));
        }
      }}
    >
          <div
            className="shrink-0 border-b border-[var(--color-border-light)] pb-4"
            style={isDialogLayout ? { flexShrink: 0 } : undefined}
          >
            <QuoteBuilderStepper current={step} onChange={setStep} />
          </div>

          <div
            ref={scrollAreaRef}
            className={scrollAreaClass}
            data-testid="quote-builder-scroll-area"
            style={isDialogLayout ? {
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
              overscrollBehaviorY: "contain",
            } : undefined}
          >
            <div className="grid content-start gap-6">

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
            <div className="grid gap-2">
              <Label htmlFor="customerId">Cliente</Label>
              <input type="hidden" name="customerId" value={customerId} />
              <Input
                ref={customerInputRef}
                id="customerId"
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
                  customerSearchRequest.current += 1;
                  setCustomerSearch(nextSearch);
                  setCustomerId("");
                  selectedCustomerRef.current = undefined;
                  setCustomerSearchError(null);
                  setIsSearchingCustomers(false);
                  const cached = customerQueryCache.current.get(nextSearch.trim().toLocaleLowerCase("es-MX"));
                  const nextOptions = cached ?? filterCustomers([...knownCustomersRef.current.values()], nextSearch);
                  setCustomerOptions(nextOptions);
                  setIsCustomerListOpen(true);
                  setActiveCustomerIndex(nextOptions.length ? 0 : -1);
                }}
                onFocus={() => setIsCustomerListOpen(true)}
                onClick={() => setIsCustomerListOpen(true)}
                onKeyDown={handleCustomerSearchKeyDown}
                placeholder="Buscar por nombre, correo, teléfono, dirección, placas o notas"
              />
              {isSearchingCustomers ? <p className="text-sm text-[var(--color-text-muted)]" role="status">Buscando clientes...</p> : null}
              {customerSearchError ? <p className="text-sm text-[var(--color-status-danger-fg)]" role="alert">{customerSearchError}</p> : null}
              {isCustomerListOpen && !customerSearchError ? createPortal(
                <div ref={customerListRef} id="customer-results" role="listbox" aria-label="Resultados de clientes" data-dialog-popover style={{ ...customerListPosition, pointerEvents: "auto" }} className="fixed z-[60] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1 shadow-lg">
                  {customerOptions.length ? customerOptions.map((customer) => (
                    <button
                      key={customer.id}
                      id={`customer-option-${customer.id}`}
                      type="button"
                      role="option"
                      aria-selected={customerOptions[activeCustomerIndex]?.id === customer.id}
                      className={`flex min-h-11 w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${customerOptions[activeCustomerIndex]?.id === customer.id ? "bg-[var(--color-bg-soft)]" : ""}`}
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
              {selectedCustomer ? <p className="text-sm text-[var(--color-text-muted)]">Cliente seleccionado: <strong className="text-[var(--color-text-main)]">{selectedCustomer.name}</strong></p> : null}
              {createCustomerAction ? (
                <div className="grid gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-main)]">¿No encuentras el cliente?</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Créalo sin salir de la cotización.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateCustomer((current) => !current)}
                      aria-expanded={showCreateCustomer}
                    >
                      Crear cliente
                    </Button>
                  </div>

                  {showCreateCustomer ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="quoteCustomerName">Nombre</Label>
                        <Input
                          id="quoteCustomerName"
                          value={newCustomerName}
                          onChange={(event) => setNewCustomerName(event.target.value)}
                          placeholder="Nombre del cliente"
                          required
                        />
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
                        <p className="text-sm text-[var(--color-status-danger-fg)]" role="alert">
                          {createCustomerError}
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full sm:w-fit"
                        loading={isCreatingCustomer}
                        disabled={newCustomerName.trim() === ""}
                        onClick={handleCreateCustomer}
                      >
                        Guardar y seleccionar
                      </Button>
                    </div>
                  ) : null}
                  {createCustomerMessage ? (
                    <p className="text-sm text-[var(--color-status-success-fg)]" role="status">
                      {createCustomerMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
              <p className="text-sm font-medium text-[var(--color-text-main)]">Vehículo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="plate">Placas (opcional)</Label>
                  <Input
                    id="plate"
                    name="plate"
                    maxLength={10}
                    value={vehicle.plate}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, plate: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Marca (opcional)</Label>
                  <Input
                    id="brand"
                    name="brand"
                    value={vehicle.brand}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, brand: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Modelo (opcional)</Label>
                  <Input
                    id="model"
                    name="model"
                    value={vehicle.model}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, model: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="year">Año (opcional)</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    value={vehicle.year}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, year: event.target.value }))}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Conceptos */}
          <div hidden={step !== "items"}>
            <h2 className="sr-only" tabIndex={-1} data-step-heading="items">
              Conceptos
            </h2>
            <QuoteBuilderItemsStep
              items={items}
              rowIds={itemRowIds}
              animatedRowId={animatedItemRowId}
              showItemValidation={showItemValidation}
              completeItemsCount={completeItems.length}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onDuplicateItem={duplicateItem}
              onUpdateItem={updateItem}
              onAdjustQuantity={adjustItemQuantity}
              onRowRef={(rowId, node) => {
                if (node) itemRowRefs.current.set(rowId, node);
                else itemRowRefs.current.delete(rowId);
              }}
              onDescriptionRef={(rowId, node) => {
                if (node) itemDescriptionRefs.current.set(rowId, node);
                else itemDescriptionRefs.current.delete(rowId);
              }}
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
                  setTitle(nextTitle);
                  setStepError((current) =>
                    current
                      ? getStepError("notes", { customerId, vehicle, title: nextTitle, items })
                      : null,
                  );
                }}
                placeholder="Ej. Servicio general"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Detalles adicionales de la cotización..."
              />
            </div>
            <Checkbox
              name="administrative"
              label="Cotización administrativa"
              checked={administrative}
              onCheckedChange={(checked) => setAdministrative(checked === true)}
            />
            <input type="hidden" name="taxEnabled" value={taxEnabled ? "on" : "off"} />
            <Checkbox
              label="Incluir IVA (16%)"
              checked={taxEnabled}
              onCheckedChange={(checked) => setTaxEnabled(checked === true)}
            />
          </section>

          {/* Step 4: Resumen */}
          <section hidden={step !== "summary"} className="grid gap-4">
            <h2 className="sr-only" tabIndex={-1} data-step-heading="summary">
              Resumen
            </h2>
            <QuoteSummaryCard
              customerName={selectedCustomer?.name ?? ""}
              vehicle={vehicle}
              title={title}
              description={description}
              administrative={administrative}
              items={completeItems}
              subtotalCents={subtotalCents}
              taxCents={taxCents}
              totalCents={totalCents}
            />
          </section>

          {/* Step 5: Preview / Enviar */}
          <section hidden={step !== "preview"} className="grid gap-4">
            <h2 className="sr-only" tabIndex={-1} data-step-heading="preview">
              Enviar cotización
            </h2>
            <QuotePreviewCard
              customerName={selectedCustomer?.name ?? ""}
              vehicle={vehicle}
              title={title}
              description={description}
              administrative={administrative}
              items={completeItems}
              subtotalCents={subtotalCents}
              taxCents={taxCents}
              totalCents={totalCents}
              validUntil={validUntil}
            />
          </section>
            </div>
          </div>

          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-light)] bg-[var(--color-surface)] pt-4"
            data-testid="quote-builder-footer"
            style={isDialogLayout ? { flexShrink: 0 } : undefined}
          >
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

            {step === "preview" ? (
              <Button type="submit" variant="primary" loading={isSubmitting} className="min-w-[160px]" aria-live="polite">
                {isSubmitting ? (isEdit ? "Guardando..." : "Creando...") : (isEdit ? "Guardar cambios" : "Crear cotización")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={goToNext}
                disabled={step === "client" && !customerId}
                className="min-w-[140px]"
              >
                Siguiente
              </Button>
            )}
          </div>
    </form>
  );
}
