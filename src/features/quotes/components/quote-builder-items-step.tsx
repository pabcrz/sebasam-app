"use client";

import * as React from "react";
import { QuoteItemType } from "@prisma/client";
import { ChevronDown, ChevronUp, Copy, Minus, Plus, PlusCircle, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  itemTypeLabels,
  itemTypes,
  SectionFormValue,
  maxUnitPrice,
  getMaxQuantityForType,
  validateItemFields,
} from "./quote-builder-shared";
import { formatCents } from "@/features/quotes/lib/format";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableSection, SortableItem, DragHandle } from "./quote-builder-dnd";
import { QuoteTotalsCard } from "./quote-totals-card";
import { SwipeableRow } from "./swipeable-row";
import type { QuoteBuilderItemsAction } from "./quote-builder-state";

function formatConceptSummaryDescription(description: string) {
  return description.trim().replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("es-MX"));
}

export type QuoteBuilderItemsState = {
  sections: SectionFormValue[];
  taxEnabled: boolean;
  discount: string;
};

export type QuoteBuilderItemsSummary = {
  completeItemsCount: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

export type QuoteBuilderItemsFocus = {
  animatedRowId: string | null;
  expandedItemRowId: string | null;
  onToggleItem: (rowId: string) => void;
  onRowRef: (rowId: string, node: HTMLDivElement | null) => void;
  onDescriptionRef: (rowId: string, node: HTMLInputElement | null) => void;
};

export interface QuoteBuilderItemsStepProps {
  state: QuoteBuilderItemsState;
  summary: QuoteBuilderItemsSummary;
  dispatch: (action: QuoteBuilderItemsAction) => void;
  focus: QuoteBuilderItemsFocus;
  allowedItemTypes?: QuoteItemType[];
}

export function QuoteBuilderItemsStep({
  state: { sections, taxEnabled, discount },
  summary: { completeItemsCount, subtotalCents, discountCents, taxCents, totalCents },
  dispatch,
  focus: { animatedRowId, expandedItemRowId, onToggleItem, onRowRef, onDescriptionRef },
  allowedItemTypes = itemTypes,
}: QuoteBuilderItemsStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      if (active.data.current?.type === "Section" && over.data.current?.type === "Section") {
        const oldIndex = sections.findIndex((s, i) => `section-${i}` === active.id);
        const newIndex = sections.findIndex((s, i) => `section-${i}` === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          dispatch({ type: "reorderSection", oldIndex, newIndex });
        }
      } else if (active.data.current?.type === "Item" && over.data.current?.type === "Item") {
        let activeSectionIndex = -1;
        let activeItemIndex = -1;
        let overSectionIndex = -1;
        let overItemIndex = -1;

        sections.forEach((s, sIdx) => {
          const aIdx = s.rowIds.indexOf(active.id as string);
          if (aIdx !== -1) {
            activeSectionIndex = sIdx;
            activeItemIndex = aIdx;
          }
          const oIdx = s.rowIds.indexOf(over.id as string);
          if (oIdx !== -1) {
            overSectionIndex = sIdx;
            overItemIndex = oIdx;
          }
        });

        if (activeSectionIndex !== -1 && overSectionIndex !== -1) {
          dispatch({ type: "reorderItem", activeSectionIndex, activeItemIndex, overSectionIndex, overItemIndex });
        }
      }
    }
  }

  return (
    <section className="grid gap-3 px-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="min-w-0 font-semibold text-[var(--color-text-main)]">Conceptos</h3>
        {completeItemsCount > 0 ? (
          <Badge variant="info">{completeItemsCount} completos</Badge>
        ) : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((_, i) => `section-${i}`)} strategy={verticalListSortingStrategy}>
          {sections.map((section, sectionIndex) => (
            <SortableSection key={`section-${sectionIndex}`} id={`section-${sectionIndex}`}>
              <div
                className="grid min-w-0 gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] p-3"
                data-testid={`section-${sectionIndex}`}
              >
                {/* Section header */}
                <div className="flex flex-wrap items-center gap-2">
                  <DragHandle
                    ariaLabel={`Reordenar sección ${sectionIndex + 1}`}
                    className="size-4 shrink-0 text-[var(--color-text-muted)] touch-none cursor-grab"
                  />
                  <div className="flex min-w-0 flex-1 basis-48 items-center gap-2">
                    <input
                      aria-label={`Nombre de la sección ${sectionIndex + 1}`}
                placeholder="Nombre de la sección (ej. Parte delantera)"
                value={section.name}
                onChange={(e) => dispatch({ type: "updateSectionName", sectionIndex, name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent p-0 text-sm font-semibold text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)]"
                name={`sections.${sectionIndex}.name`}
              />
            </div>

            {sections.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Eliminar sección ${sectionIndex + 1}`}
                onClick={() => dispatch({ type: "removeSection", sectionIndex })}
                className="size-8 shrink-0 text-[var(--color-status-danger-fg)] hover:bg-[var(--color-status-danger-bg)]"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {/* Items in this section */}
          <SortableContext items={section.rowIds} strategy={verticalListSortingStrategy}>
            <div
              className="grid min-w-0 gap-3"
              data-testid={`concept-list-${sectionIndex}`}
            >
              {section.items.map((item, itemIndex) => {
                const rowId = section.rowIds[itemIndex]!;
                const displayIndex = sections
                  .slice(0, sectionIndex)
                  .reduce((acc, s) => acc + s.items.length, 0) + itemIndex;
                const itemErrors = validateItemFields(item, displayIndex, true);
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
                const lineTotalCents = pendingSummary === null
                  ? Math.round(Number(item.quantity) * unitPrice * 100)
                  : null;
                const typeQuantityLimit = getMaxQuantityForType(item.type);
                const fieldId = `sections-${sectionIndex}-items-${itemIndex}`;
                const descriptionErrorId = `${fieldId}-description-error`;
                const quantityErrorId = `${fieldId}-quantity-error`;
                const unitPriceCurrencyId = `${fieldId}-unitPrice-currency`;
                const unitPriceErrorId = `${fieldId}-unitPrice-error`;
                const isExpanded = expandedItemRowId === rowId;

                return (
                  <SortableItem key={rowId} id={rowId}>
                    <SwipeableRow
                      disabled={isExpanded}
                      onConfirmDelete={() => dispatch({ type: "removeItem", sectionIndex, itemIndex })}
                      aria-label={`Eliminar concepto ${displayIndex + 1}`}
                    >
                    <div
                      ref={(node) => onRowRef(rowId, node)}
                      data-testid={`concept-row-${displayIndex}`}
                      className={`grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-1${rowId === animatedRowId ? " motion-safe:animate-fade-in motion-safe:animate-duration-200" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <DragHandle
                          ariaLabel={`Reordenar concepto ${displayIndex + 1}`}
                          className="size-10 shrink-0 text-[var(--color-text-muted)] touch-none cursor-grab"
                        />
                        <button
                          type="button"
                          aria-controls={`concept-editor-${rowId}`}
                          aria-expanded={isExpanded}
                          onClick={() => onToggleItem(rowId)}
                          data-testid={`concept-summary-${displayIndex}`}
                          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[var(--radius-sm)] px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                        >
                          <div className="grid min-w-0 flex-1 gap-1">
                            <span className="break-words text-base font-semibold leading-5 text-[var(--color-text-main)] sm:text-sm">
                              {formatConceptSummaryDescription(item.description) || "Concepto sin descripción"}
                            </span>
                            <span className={`${isExpanded ? "hidden" : "flex flex-wrap"} items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]`}>
                              {item.quantity.trim() ? <span className="font-medium text-[var(--color-text-main)]">{item.quantity} unidad{item.quantity === "1" ? "" : "es"}</span> : null}
                              <span>{itemTypeLabels[item.type]}</span>
                              {item.type === "OTHER" && item.includeInPayroll ? (
                                <span className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-main)]">
                                  {item.customRatePercent || "40"}% nómina
                                </span>
                              ) : null}
                              {pendingSummary ? (
                                <span className="font-medium text-[var(--color-status-danger-fg)]">{pendingSummary}</span>
                              ) : (
                                <span className="font-medium text-[var(--color-text-main)]">{formatCents(lineTotalCents!)}</span>
                              )}
                            </span>
                          </div>
                          <span
                            className="shrink-0 text-[var(--color-text-muted)] transition-transform duration-200"
                            aria-hidden="true"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Duplicar concepto ${displayIndex + 1}`}
                          onClick={() => dispatch({ type: "duplicateItem", sectionIndex, itemIndex })}
                          className="group inline-flex size-[var(--tap-min-height)] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] sm:h-8 sm:w-8"
                        >
                          <Copy className="size-4 icon-copy-hover" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar concepto ${displayIndex + 1}`}
                          onClick={() => dispatch({ type: "removeItem", sectionIndex, itemIndex })}
                          className="group hidden h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-status-danger-fg)] transition-colors hover:bg-[var(--color-status-danger-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] sm:inline-flex"
                        >
                          <Trash2 className="size-4 icon-trash-hover" aria-hidden="true" />
                        </button>
                      </div>
                      <div id={`concept-editor-${rowId}`} hidden={!isExpanded} className="grid gap-2.5 border-t border-[var(--color-border-light)] px-1 pt-2.5">
                    <input type="hidden" name={`sections.${sectionIndex}.items.${itemIndex}.type`} value={item.type} />
<div className="grid gap-2">
                    <Label htmlFor={`${fieldId}-type`}>Tipo</Label>
                    <Select
                      value={item.type}
                      onValueChange={(value) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { type: value as QuoteItemType } })}
                    >
                      <SelectTrigger id={`${fieldId}-type`} aria-label={`Tipo del concepto ${displayIndex + 1}`} className="w-full sm:w-auto sm:min-w-36">
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
                    </div>
                    <div className="grid gap-2">
                    <Label htmlFor={`${fieldId}-description`}>Descripción</Label>
                    <Input
                      ref={(node) => onDescriptionRef(rowId, node)}
                      id={`${fieldId}-description`}
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
                      aria-describedby={itemErrors.description ? descriptionErrorId : undefined}
                      aria-invalid={itemErrors.description ? true : undefined}
                    />
                    <span
                      id={descriptionErrorId}
                      role={itemErrors.description ? "alert" : undefined}
                      className="min-h-4 text-xs text-[var(--color-status-danger-fg)]"
                    >
                      {itemErrors.description}
                    </span>
                    </div>
                    <div
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3"
                    data-testid={`quantity-price-row-${displayIndex}`}
                  >
                    <div className="grid min-w-0 gap-2">
                      <Label htmlFor={`${fieldId}-quantity`}>Cantidad</Label>
                      <div className="flex w-full min-w-0 max-w-35 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:ring-[3px] focus-within:ring-[var(--color-focus-ring)]">
                        <button
                          type="button"
                          aria-label={`Restar cantidad del concepto ${displayIndex + 1}`}
                          onClick={() => dispatch({ type: "adjustItemQuantity", sectionIndex, itemIndex, delta: -1 })}
                          disabled={Number(item.quantity) <= 1}
                          className="inline-flex h-[var(--tap-min-height)] w-10 shrink-0 cursor-pointer items-center justify-center rounded-l-[calc(var(--radius-sm)-1px)] border-r border-[var(--color-border-light)] text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-soft)] active-press-subtle focus-visible:outline-none focus-visible:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-11"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <input
                          id={`${fieldId}-quantity`}
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
                          aria-describedby={itemErrors.quantity ? quantityErrorId : undefined}
                          aria-invalid={itemErrors.quantity ? true : undefined}
                        />
                        <button
                          type="button"
                          aria-label={`Sumar cantidad del concepto ${displayIndex + 1}`}
                          onClick={() => dispatch({ type: "adjustItemQuantity", sectionIndex, itemIndex, delta: 1 })}
                          disabled={Number(item.quantity) >= typeQuantityLimit}
                          className="inline-flex h-[var(--tap-min-height)] w-10 shrink-0 cursor-pointer items-center justify-center rounded-r-[calc(var(--radius-sm)-1px)] border-l border-[var(--color-border-light)] text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-soft)] active-press-subtle focus-visible:outline-none focus-visible:bg-[var(--color-bg-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-11"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <span
                        id={quantityErrorId}
                        role={itemErrors.quantity ? "alert" : undefined}
                        className="min-h-4 text-xs text-[var(--color-status-danger-fg)]"
                      >
                        {itemErrors.quantity}
                      </span>
                    </div>
                    <div className="grid min-w-0 gap-2">
                      <Label htmlFor={`${fieldId}-unitPrice`}>Precio unitario</Label>
                      <span id={unitPriceCurrencyId} className="sr-only">
                        Importe en pesos mexicanos.
                      </span>
                      <div className="flex min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:ring-[3px] focus-within:ring-[var(--color-focus-ring)]">
                        <span
                          className="flex items-center self-stretch pl-3 pr-1 text-[var(--color-text-muted)]"
                          data-testid={`currency-prefix-${displayIndex}`}
                          aria-hidden="true"
                        >
                          $
                        </span>
                        <input
                          id={`${fieldId}-unitPrice`}
                          name={`sections.${sectionIndex}.items.${itemIndex}.unitPrice`}
                          type="number"
                          min="0"
                          max={maxUnitPrice}
                          step="0.01"
                          aria-describedby={`${unitPriceCurrencyId}${itemErrors.unitPrice ? ` ${unitPriceErrorId}` : ""}`}
                          aria-invalid={itemErrors.unitPrice ? true : undefined}
                          value={item.unitPrice}
                          onChange={(event) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { unitPrice: event.target.value } })}
                          onWheelCapture={(event) => event.currentTarget.blur()}
                          className="h-[var(--tap-min-height)] min-w-0 flex-1 bg-transparent py-2 pl-1 pr-3 text-base text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </div>
                      <span
                        id={unitPriceErrorId}
                        role={itemErrors.unitPrice ? "alert" : undefined}
                        className="min-h-4 text-xs text-[var(--color-status-danger-fg)]"
                      >
                        {itemErrors.unitPrice}
                      </span>
                    </div>
                    </div>

                    {item.type === "OTHER" ? (
                      <div className="grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
                        <label
                          htmlFor={`${fieldId}-includeInPayroll`}
                          className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-main)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            id={`${fieldId}-includeInPayroll`}
                            name={`sections.${sectionIndex}.items.${itemIndex}.includeInPayroll`}
                            checked={Boolean(item.includeInPayroll)}
                            onChange={(e) => dispatch({
                              type: "updateItem",
                              sectionIndex,
                              itemIndex,
                              patch: {
                                includeInPayroll: e.target.checked,
                                customRatePercent: item.customRatePercent || "40",
                              },
                            })}
                            className="size-4 rounded border-[var(--color-border-input)] text-[var(--color-primary)] focus:ring-[var(--color-ring)]"
                          />
                          <span>Incluir en nómina / comisión</span>
                        </label>
                        {item.includeInPayroll ? (
                          <div className="grid gap-1.5 sm:max-w-xs">
                            <Label htmlFor={`${fieldId}-customRatePercent`} className="text-xs text-[var(--color-text-muted)]">
                              Porcentaje de comisión
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`${fieldId}-customRatePercent`}
                                name={`sections.${sectionIndex}.items.${itemIndex}.customRatePercent`}
                                type="number"
                                min={1}
                                max={100}
                                value={item.customRatePercent ?? "40"}
                                onChange={(e) => dispatch({ type: "updateItem", sectionIndex, itemIndex, patch: { customRatePercent: e.target.value } })}
                                className="h-9 w-24 bg-[var(--color-surface)]"
                                aria-describedby={itemErrors.customRatePercent ? `${fieldId}-rate-error` : undefined}
                                aria-invalid={Boolean(itemErrors.customRatePercent)}
                              />
                              <span className="text-sm font-medium text-[var(--color-text-muted)]">%</span>
                            </div>
                            {itemErrors.customRatePercent ? (
                              <span id={`${fieldId}-rate-error`} role="alert" className="text-xs text-[var(--color-status-danger-fg)]">
                                {itemErrors.customRatePercent}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between pt-1 text-sm text-[var(--color-text-muted)]">
                    <span>Importe</span>
                    <output className="font-medium" data-testid={`concept-total-${displayIndex}`} aria-label={`Importe del concepto ${displayIndex + 1}`}>
                      {lineTotalCents === null ? "Pendiente" : formatCents(lineTotalCents)}
                    </output>
                    </div>
                      </div>
                    </div>
                    </SwipeableRow>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>

          {/* Add item buttons for this section */}
          <div
            className="flex min-w-0 flex-nowrap items-center gap-2"
            aria-label={`Agregar concepto a sección ${sectionIndex + 1}`}
          >
            {allowedItemTypes.includes("LABOR") ? <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Agregar Mano de obra a la sección ${sectionIndex + 1}`}
              title="Mano de obra"
              onClick={() => dispatch({ type: "addItem", sectionIndex, itemType: "LABOR" })}
              className="min-w-0 flex-1 px-1 sm:px-3"
            >
              <span className="sm:hidden">+ M. O.</span>
              <span className="hidden sm:inline">+ Mano de obra</span>
            </Button> : null}
            {allowedItemTypes.includes("REFACCIONES") ? <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Agregar Refacciones a la sección ${sectionIndex + 1}`}
              title="Refacciones"
              onClick={() => dispatch({ type: "addItem", sectionIndex, itemType: "REFACCIONES" })}
              className="min-w-0 flex-1 px-1 sm:px-3"
            >
              <span className="sm:hidden">+ Refac.</span>
              <span className="hidden sm:inline">+ Refacciones</span>
            </Button> : null}
            {allowedItemTypes.includes("MATERIAL") ? <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Agregar Materiales a la sección ${sectionIndex + 1}`}
              title="Materiales"
              onClick={() => dispatch({ type: "addItem", sectionIndex, itemType: "MATERIAL" })}
              className="min-w-0 flex-1 px-1 sm:px-3"
            >
              <span className="sm:hidden">+ Mat.</span>
              <span className="hidden sm:inline">+ Materiales</span>
            </Button> : null}
            {allowedItemTypes.includes("OTHER") ? <ConceptTypePopover onSelect={(itemType) => dispatch({ type: "addItem", sectionIndex, itemType })} /> : null}
          </div>
        </div>
      </SortableSection>
      ))}
      </SortableContext>
      </DndContext>

      {/* Add section button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dispatch({ type: "addSection" })}
        className="flex items-center gap-2 self-start"
      >
        <PlusCircle className="size-4" aria-hidden="true" />
        Agregar sección
      </Button>

      <div className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold text-[var(--color-text-main)]">Totales</h4>
            <p className="text-sm text-[var(--color-text-muted)]">Ajusta el IVA o descuento y revisa su impacto antes de enviar.</p>
          </div>
          <input type="hidden" name="taxEnabled" value={taxEnabled ? "on" : "off"} />
          <Checkbox
            label="Incluir IVA (16%)"
            checked={taxEnabled}
            onCheckedChange={(checked) => dispatch({ type: "setTaxEnabled", taxEnabled: checked === true })}
            className="shrink-0"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="discount">Descuento Global (Opcional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
            <Input
              id="discount"
              name="discount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="pl-7"
              value={discount}
              onChange={(event) => dispatch({ type: "setDiscount", discount: event.target.value })}
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Este descuento se aplicará al subtotal, reduciendo el total sin alterar los costos individuales (ej. nómina).
          </p>
        </div>
        <QuoteTotalsCard
          subtotalCents={subtotalCents}
          discountCents={discountCents}
          taxCents={taxCents}
          totalCents={totalCents}
        />
      </div>
    </section>
  );
}

function ConceptTypePopover({ onSelect }: { onSelect: (type: QuoteItemType) => void }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const overflowTypes: QuoteItemType[] = ["OTHER"];

  React.useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Más tipos de concepto"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-10 shrink-0 px-0"
      >
        ⋯
      </Button>
      {open ? (
        <div
          role="menu"
          aria-label="Otros tipos de concepto"
          className="absolute right-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-1 shadow-lg"
        >
          {overflowTypes.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(type);
                setOpen(false);
              }}
              className="flex min-h-9 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left text-sm text-[var(--color-text-main)] hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              + {itemTypeLabels[type]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
