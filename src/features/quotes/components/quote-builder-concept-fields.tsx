"use client";

import * as React from "react";
import { QuoteItemType } from "@/generated/prisma/enums";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Chip,
  ChipAdd,
  ChipRow,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui";
import {
  getMaxQuantityForType,
  itemTypeLabels,
  ItemFieldErrors,
  ItemFormValue,
  maxUnitPrice,
  SectionFormValue,
  validateItemFields,
} from "./quote-builder-shared";
import type { QuoteBuilderItemsAction } from "./quote-builder-state";

/** Stacked: label above the control (mobile editor). Table: the column header labels it, so only aria-label. */
export type ConceptFieldMode = "stacked" | "table";

export type ConceptRowModel = {
  rowId: string;
  sectionIndex: number;
  itemIndex: number;
  displayIndex: number;
  item: ItemFormValue;
  fieldId: string;
  errors: ItemFieldErrors;
  lineTotalCents: number | null;
  unitPriceCents: number | null;
  pendingSummary: string | null;
};

export type ConceptRowHandlers = {
  dispatch: (action: QuoteBuilderItemsAction) => void;
  onDescriptionRef: (rowId: string, node: HTMLInputElement | null) => void;
};

const addChipNames: Partial<Record<QuoteItemType, string>> = {
  LABOR: "Mano de obra",
  REFACCIONES: "Refacciones",
  MATERIAL: "Materiales",
};

export function buildConceptRowModel(
  sections: SectionFormValue[],
  sectionIndex: number,
  itemIndex: number,
  rowId: string,
): ConceptRowModel {
  const item = sections[sectionIndex]!.items[itemIndex]!;
  const displayIndex = sections
    .slice(0, sectionIndex)
    .reduce((acc, s) => acc + s.items.length, 0) + itemIndex;
  const errors = validateItemFields(item, displayIndex, true);
  const unitPrice = Number(item.unitPrice);
  const quantity = Number(item.quantity);
  const hasValidQuantity = item.quantity.trim() !== "" && Number.isInteger(quantity) && quantity > 0 && quantity <= getMaxQuantityForType(item.type);
  const hasValidPrice = item.unitPrice.trim() !== "" && Number.isFinite(unitPrice) && unitPrice >= 0 && unitPrice <= maxUnitPrice;
  const pendingFields = [
    ...(item.description.trim() === "" ? ["descripción"] : []),
    ...(!hasValidQuantity ? ["cantidad"] : []),
    ...(!hasValidPrice ? [item.unitPrice.trim() === "" ? "precio" : "precio válido"] : []),
  ];
  const pendingSummary = pendingFields.length ? `Pendiente: ${pendingFields.join(", ")}` : null;

  return {
    rowId,
    sectionIndex,
    itemIndex,
    displayIndex,
    item,
    fieldId: `sections-${sectionIndex}-items-${itemIndex}`,
    errors,
    pendingSummary,
    lineTotalCents: pendingSummary === null ? Math.round(Number(item.quantity) * unitPrice * 100) : null,
    unitPriceCents: hasValidPrice ? Math.round(unitPrice * 100) : null,
  };
}

function FieldLabel({ mode, htmlFor, children }: { mode: ConceptFieldMode; htmlFor: string; children: React.ReactNode }) {
  return mode === "stacked" ? <Label htmlFor={htmlFor}>{children}</Label> : null;
}

export function ConceptTypeChips({
  model,
  allowedItemTypes,
  dispatch,
}: { model: ConceptRowModel; allowedItemTypes: QuoteItemType[] } & Pick<ConceptRowHandlers, "dispatch">) {
  const { item, sectionIndex, itemIndex, displayIndex } = model;
  return (
    <ChipRow label={`Tipo del concepto ${displayIndex + 1}`}>
      {allowedItemTypes.map((type) => (
        <Chip
          key={type}
          pressed={item.type === type}
          onClick={() => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { type } })}
        >
          {itemTypeLabels[type]}
        </Chip>
      ))}
    </ChipRow>
  );
}

export function ConceptTypeSelect({
  model,
  allowedItemTypes,
  dispatch,
}: { model: ConceptRowModel; allowedItemTypes: QuoteItemType[] } & Pick<ConceptRowHandlers, "dispatch">) {
  const { item, fieldId, sectionIndex, itemIndex, displayIndex } = model;
  return (
    <Select
      value={item.type}
      onValueChange={(value) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { type: value as QuoteItemType } })}
    >
      <SelectTrigger
        id={`${fieldId}-type`}
        aria-label={`Tipo del concepto ${displayIndex + 1}`}
        className="h-9 w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowedItemTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {itemTypeLabels[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ConceptDescriptionField({
  model,
  mode,
  dispatch,
  onDescriptionRef,
}: { model: ConceptRowModel; mode: ConceptFieldMode } & ConceptRowHandlers) {
  const { rowId, item, fieldId, errors, sectionIndex, itemIndex } = model;
  const descriptionErrorId = `${fieldId}-description-error`;
  return (
    <div className="grid min-w-0 gap-2">
      <FieldLabel mode={mode} htmlFor={`${fieldId}-description`}>Descripción</FieldLabel>
      <Input
        ref={(node) => onDescriptionRef(rowId, node)}
        id={`${fieldId}-description`}
        aria-label={mode === "table" ? "Descripción" : undefined}
        name={`sections.${sectionIndex}.items.${itemIndex}.description`}
        value={item.description}
        onChange={(event) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { description: event.target.value } })}
        placeholder={
          item.type === "MATERIAL"
            ? "Ej. Bujes o perchas"
            : item.type === "REFACCIONES"
              ? "Ej. Tensores o balancines"
              : item.type === "OTHER"
                ? "Ej. Servicio general"
                : "Ej. Bajar dos muelles"
        }
        aria-describedby={errors.description ? descriptionErrorId : undefined}
        aria-invalid={errors.description ? true : undefined}
      />
      <span
        id={descriptionErrorId}
        role={errors.description ? "alert" : undefined}
        className="min-h-4 text-xs text-[var(--color-status-danger-fg)]"
      >
        {errors.description}
      </span>
    </div>
  );
}

export function ConceptQuantityField({
  model,
  mode,
  dispatch,
}: { model: ConceptRowModel; mode: ConceptFieldMode } & Pick<ConceptRowHandlers, "dispatch">) {
  const { item, fieldId, errors, sectionIndex, itemIndex, displayIndex } = model;
  const quantityErrorId = `${fieldId}-quantity-error`;
  const typeQuantityLimit = getMaxQuantityForType(item.type);
  // In the table, Tab goes Cant. -> Precio; the stepper buttons stay reachable by pointer.
  const stepperTabIndex = mode === "table" ? -1 : undefined;
  return (
    <div className="grid min-w-0 gap-2">
      <FieldLabel mode={mode} htmlFor={`${fieldId}-quantity`}>Cantidad</FieldLabel>
      <div className="flex w-full min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:ring-[3px] focus-within:ring-inset focus-within:ring-[var(--color-focus-ring)]">
        <button
          type="button"
          tabIndex={stepperTabIndex}
          aria-label={`Restar cantidad del concepto ${displayIndex + 1}`}
          onClick={() => dispatch({ type: "adjustItemQuantity", sectionIndex, itemIndex, delta: -1 })}
          disabled={Number(item.quantity) <= 1}
          className="inline-flex h-[var(--tap-min-height)] w-10 shrink-0 cursor-pointer items-center justify-center rounded-l-[calc(var(--radius-sm)-1px)] border-r border-[var(--color-border-light)] text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-soft)] active-press-subtle focus-visible:outline-none focus-visible:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-11"
        >
          <Icon name="minus" className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={`${fieldId}-quantity`}
          aria-label={mode === "table" ? "Cantidad" : undefined}
          name={`sections.${sectionIndex}.items.${itemIndex}.quantity`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          max={typeQuantityLimit}
          className="h-[var(--tap-min-height)] min-w-0 flex-1 bg-transparent px-1 text-center text-base text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={item.quantity}
          onChange={(event) => {
            dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { quantity: event.target.value.replace(/\D/g, "") } });
          }}
          onBlur={(event) => {
            const digitsOnly = event.target.value.replace(/\D/g, "");
            if (digitsOnly === "") return;
            const clamped = String(Math.min(typeQuantityLimit, Math.max(1, Number(digitsOnly))));
            dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { quantity: clamped } });
          }}
          onWheel={(event) => event.currentTarget.blur()}
          aria-describedby={errors.quantity ? quantityErrorId : undefined}
          aria-invalid={errors.quantity ? true : undefined}
        />
        <button
          type="button"
          tabIndex={stepperTabIndex}
          aria-label={`Sumar cantidad del concepto ${displayIndex + 1}`}
          onClick={() => dispatch({ type: "adjustItemQuantity", sectionIndex, itemIndex, delta: 1 })}
          disabled={Number(item.quantity) >= typeQuantityLimit}
          className="inline-flex h-[var(--tap-min-height)] w-10 shrink-0 cursor-pointer items-center justify-center rounded-r-[calc(var(--radius-sm)-1px)] border-l border-[var(--color-border-light)] text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-soft)] active-press-subtle focus-visible:outline-none focus-visible:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-11"
        >
          <Icon name="plus" className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <span
        id={quantityErrorId}
        role={errors.quantity ? "alert" : undefined}
        className="min-h-4 text-xs text-[var(--color-status-danger-fg)]"
      >
        {errors.quantity}
      </span>
    </div>
  );
}

export function ConceptUnitPriceField({
  model,
  mode,
  dispatch,
  onEnter,
}: { model: ConceptRowModel; mode: ConceptFieldMode; onEnter?: () => void } & Pick<ConceptRowHandlers, "dispatch">) {
  const { item, fieldId, errors, sectionIndex, itemIndex, displayIndex } = model;
  const unitPriceCurrencyId = `${fieldId}-unitPrice-currency`;
  const unitPriceErrorId = `${fieldId}-unitPrice-error`;
  return (
    <div className="grid min-w-0 gap-2">
      <FieldLabel mode={mode} htmlFor={`${fieldId}-unitPrice`}>Precio unitario</FieldLabel>
      <span id={unitPriceCurrencyId} className="sr-only">
        Importe en pesos mexicanos.
      </span>
      <div className="flex min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:ring-[3px] focus-within:ring-inset focus-within:ring-[var(--color-focus-ring)]">
        <span
          className="flex items-center self-stretch pl-3 pr-1 text-[var(--color-text-muted)]"
          data-testid={`currency-prefix-${displayIndex}`}
          aria-hidden="true"
        >
          $
        </span>
        <input
          id={`${fieldId}-unitPrice`}
          aria-label={mode === "table" ? "Precio unitario" : undefined}
          name={`sections.${sectionIndex}.items.${itemIndex}.unitPrice`}
          type="number"
          min="0"
          max={maxUnitPrice}
          step="0.01"
          aria-describedby={`${unitPriceCurrencyId}${errors.unitPrice ? ` ${unitPriceErrorId}` : ""}`}
          aria-invalid={errors.unitPrice ? true : undefined}
          value={item.unitPrice}
          onChange={(event) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { unitPrice: event.target.value } })}
          onKeyDown={(event) => {
            // Enter in the last field of a table row adds the next concept instead of submitting the form.
            if (event.key !== "Enter" || !onEnter) return;
            event.preventDefault();
            onEnter();
          }}
          onWheelCapture={(event) => event.currentTarget.blur()}
          className="h-[var(--tap-min-height)] min-w-0 flex-1 bg-transparent py-2 pl-1 pr-3 text-base text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
      <span
        id={unitPriceErrorId}
        role={errors.unitPrice ? "alert" : undefined}
        className="min-h-4 text-xs text-[var(--color-status-danger-fg)]"
      >
        {errors.unitPrice}
      </span>
    </div>
  );
}

/**
 * Payroll is commissionable by rule: every Mano de obra concept is in payroll, while an Otro
 * concept opts in with `includeInPayroll` and a percentage. Mobile shows the opt-in only for Otro.
 */
export function ConceptPayrollField({
  model,
  mode,
  dispatch,
}: { model: ConceptRowModel; mode: ConceptFieldMode } & Pick<ConceptRowHandlers, "dispatch">) {
  const { item, fieldId, errors, sectionIndex, itemIndex, displayIndex } = model;
  if (item.type === "LABOR") {
    return mode === "table" ? (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-status-success-bg)] px-2 text-sm text-[var(--color-status-success-fg)]">
        <Icon name="cash" className="size-4" aria-hidden="true" />
        Nómina
      </span>
    ) : null;
  }
  if (item.type !== "OTHER") {
    return mode === "table" ? <span className="text-sm text-[var(--color-text-muted)]">—</span> : null;
  }

  const rateErrorId = `${fieldId}-rate-error`;
  const payrollSwitchProps = {
    id: `${fieldId}-includeInPayroll`,
    name: `sections.${sectionIndex}.items.${itemIndex}.includeInPayroll`,
    checked: Boolean(item.includeInPayroll),
    onCheckedChange: (checked: boolean) => dispatch({
      type: "updateItem",
      sectionIndex,
      itemIndex,
      patch: {
        includeInPayroll: checked === true,
        customRatePercent: item.customRatePercent || "40",
      },
    }),
  };
  // Table: an icon toggle with aria-pressed. It has no form field of its own, so the hidden input below submits the flag.
  const toggle = mode === "stacked" ? (
    <Switch label="Incluir en nómina / comisión" {...payrollSwitchProps} />
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Incluir en nómina / comisión"
      aria-pressed={Boolean(item.includeInPayroll)}
      title="Incluir en nómina / comisión"
      onClick={() => payrollSwitchProps.onCheckedChange(!item.includeInPayroll)}
      className={item.includeInPayroll ? "bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)]" : "text-[var(--color-text-muted)]"}
    >
      <Icon name="cash" className="size-4" aria-hidden="true" />
    </Button>
  );
  const rate = item.includeInPayroll ? (
    <div className={mode === "stacked" ? "grid gap-1.5 sm:max-w-xs" : "grid gap-1"}>
      {mode === "stacked" ? (
        <Label htmlFor={`${fieldId}-customRatePercent`} className="text-xs text-[var(--color-text-muted)]">
          Porcentaje de comisión
        </Label>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          id={`${fieldId}-customRatePercent`}
          aria-label={mode === "table" ? `Porcentaje de comisión del concepto ${displayIndex + 1}` : undefined}
          name={`sections.${sectionIndex}.items.${itemIndex}.customRatePercent`}
          type="number"
          min={1}
          max={100}
          value={item.customRatePercent ?? "40"}
          onChange={(e) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { customRatePercent: e.target.value } })}
          className="h-9 w-20 bg-[var(--color-surface)]"
          aria-describedby={errors.customRatePercent ? rateErrorId : undefined}
          aria-invalid={Boolean(errors.customRatePercent)}
        />
        <span className="text-sm font-medium text-[var(--color-text-muted)]">%</span>
      </div>
      {errors.customRatePercent ? (
        <span id={rateErrorId} role="alert" className="text-xs text-[var(--color-status-danger-fg)]">
          {errors.customRatePercent}
        </span>
      ) : null}
    </div>
  ) : null;

  if (mode === "table") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {toggle}
        {item.includeInPayroll ? <input type="hidden" name={payrollSwitchProps.name} value="on" /> : null}
        {rate}
      </div>
    );
  }
  return (
    <div className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
      {toggle}
      {rate}
    </div>
  );
}

export type ConceptAddChipsProps = {
  sectionIndex: number;
  allowedItemTypes: QuoteItemType[];
  dispatch: ConceptRowHandlers["dispatch"];
};

/** Dashed chips that append a concept of a type to a section. The rest of the types open a menu below the row. */
export function ConceptAddChips({ sectionIndex, allowedItemTypes, dispatch }: ConceptAddChipsProps) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sectionLabel = sectionIndex + 1;
  const addTypes = allowedItemTypes.filter((type) => addChipNames[type] !== undefined);
  const overflowTypes = allowedItemTypes.filter((type) => addChipNames[type] === undefined);

  React.useEffect(() => {
    if (!moreOpen) return;

    function handleClickOutside(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [moreOpen]);

  return (
    <div ref={containerRef} className="grid min-w-0 gap-2">
      <ChipRow label={`Agregar concepto a sección ${sectionLabel}`}>
        {addTypes.map((type) => (
          <ChipAdd
            key={type}
            aria-label={`Agregar ${addChipNames[type]} a la sección ${sectionLabel}`}
            onClick={() => dispatch({ type: "addItem", sectionIndex, itemType: type })}
          >
            {addChipNames[type]}
          </ChipAdd>
        ))}
        {overflowTypes.length > 0 ? (
          <ChipAdd
            aria-label="Más tipos de concepto"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            Más
          </ChipAdd>
        ) : null}
      </ChipRow>
      {moreOpen ? (
        <div
          role="menu"
          aria-label="Otros tipos de concepto"
          className="grid justify-items-start gap-1 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1"
        >
          {overflowTypes.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => {
                dispatch({ type: "addItem", sectionIndex, itemType: type });
                setMoreOpen(false);
              }}
              className="flex min-h-9 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]"
            >
              + {itemTypeLabels[type]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
