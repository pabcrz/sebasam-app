"use client";

import * as React from "react";
import type { QuoteItemType } from "@/generated/prisma/enums";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { DragHandle, SortableItem } from "./quote-builder-dnd";
import { SwipeableRow } from "./swipeable-row";
import {
  ConceptDescriptionField,
  ConceptPayrollField,
  ConceptQuantityField,
  ConceptRowHandlers,
  ConceptRowModel,
  ConceptTypeChips,
  ConceptUnitPriceField,
} from "./quote-builder-concept-fields";

function formatConceptSummaryDescription(description: string) {
  return description.trim().replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("es-MX"));
}

export type MobileConceptRowProps = ConceptRowHandlers & {
  model: ConceptRowModel;
  allowedItemTypes: QuoteItemType[];
  isExpanded: boolean;
  animated: boolean;
  onToggle: (rowId: string) => void;
  onRowRef: (rowId: string, node: HTMLElement | null) => void;
};

/** One concept in the flat mobile list: a summary that expands into the editor and collapses on Listo. */
export function MobileConceptRow({
  model,
  allowedItemTypes,
  isExpanded,
  animated,
  dispatch,
  onDescriptionRef,
  onToggle,
  onRowRef,
}: MobileConceptRowProps) {
  const { rowId, sectionIndex, itemIndex, displayIndex, item, pendingSummary, lineTotalCents, unitPriceCents } = model;
  const editorId = `concept-editor-${rowId}`;
  const handlers = { dispatch, onDescriptionRef };

  return (
    <SortableItem id={rowId} className="border-t border-[var(--color-border-light)] first:border-t-0">
      <SwipeableRow
        disabled={isExpanded}
        onConfirmDelete={() => dispatch({ type: "removeItem", sectionIndex, itemIndex })}
        aria-label={`Eliminar concepto ${displayIndex + 1}`}
      >
        <div
          ref={(node) => onRowRef(rowId, node)}
          data-testid={`concept-row-${displayIndex}`}
          className={`grid bg-[var(--color-surface)]${animated ? " motion-safe:animate-fade-in motion-safe:animate-duration-200" : ""}`}
        >
          <div className="flex items-center gap-1">
            <DragHandle
              ariaLabel={`Reordenar concepto ${displayIndex + 1}`}
              className="size-10 shrink-0 touch-none cursor-grab"
            />
            <button
              type="button"
              aria-controls={editorId}
              aria-expanded={isExpanded}
              onClick={() => onToggle(rowId)}
              data-testid={`concept-summary-${displayIndex}`}
              className="flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="break-words text-[15px] font-semibold leading-5 text-[var(--color-text-main)]">
                  {formatConceptSummaryDescription(item.description) || "Concepto sin descripción"}
                </span>
                <span className={`${isExpanded ? "hidden" : "flex"} flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]`}>
                  {pendingSummary ? (
                    <span className="font-medium text-[var(--color-status-danger-fg)]">{pendingSummary}</span>
                  ) : (
                    <span className="tabular-nums">{item.quantity} × {formatCents(unitPriceCents)}</span>
                  )}
                  {item.type === "OTHER" && item.includeInPayroll ? (
                    <span className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-main)]">
                      {item.customRatePercent || "40"}% nómina
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-text-main)]">
                {lineTotalCents === null ? "Pendiente" : formatCents(lineTotalCents)}
              </span>
              <span className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true">
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="h-4 w-4" />
              </span>
            </button>
          </div>

          <div id={editorId} hidden={!isExpanded} className="grid gap-3 py-2 pb-4 pl-[52px] pr-1">
            <input type="hidden" name={`sections.${sectionIndex}.items.${itemIndex}.type`} value={item.type} />
            <ConceptTypeChips model={model} allowedItemTypes={allowedItemTypes} dispatch={dispatch} />
            <ConceptDescriptionField model={model} mode="stacked" {...handlers} />
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3"
              data-testid={`quantity-price-row-${displayIndex}`}
            >
              <ConceptQuantityField model={model} mode="stacked" dispatch={dispatch} />
              <ConceptUnitPriceField model={model} mode="stacked" dispatch={dispatch} />
            </div>
            <ConceptPayrollField model={model} mode="stacked" dispatch={dispatch} />
            <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
              <span>Importe</span>
              <output className="font-medium tabular-nums" data-testid={`concept-total-${displayIndex}`} aria-label={`Importe del concepto ${displayIndex + 1}`}>
                {lineTotalCents === null ? "Pendiente" : formatCents(lineTotalCents)}
              </output>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t border-[var(--color-border-light)] pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Duplicar concepto ${displayIndex + 1}`}
                onClick={() => dispatch({ type: "duplicateItem", sectionIndex, itemIndex })}
              >
                <Icon name="copy" className="size-4" aria-hidden="true" />
                Duplicar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Eliminar concepto ${displayIndex + 1}`}
                onClick={() => dispatch({ type: "removeItem", sectionIndex, itemIndex })}
                className="text-[var(--color-status-danger-fg)] hover:bg-[var(--color-status-danger-bg)]"
              >
                <Icon name="trash" className="size-4" aria-hidden="true" />
                Eliminar
              </Button>
              <Button
                type="button"
                variant="tonal"
                size="sm"
                className="ml-auto"
                aria-controls={editorId}
                onClick={() => onToggle(rowId)}
              >
                Listo
              </Button>
            </div>
          </div>
        </div>
      </SwipeableRow>
    </SortableItem>
  );
}
