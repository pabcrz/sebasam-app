"use client";

import * as React from "react";
import type { QuoteItemType } from "@/generated/prisma/enums";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { DragHandle, SortableItem } from "./quote-builder-dnd";
import {
  ConceptDescriptionField,
  ConceptPayrollField,
  ConceptQuantityField,
  ConceptRowHandlers,
  ConceptRowModel,
  ConceptTypeSelect,
  ConceptUnitPriceField,
} from "./quote-builder-concept-fields";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export type ConceptTableProps = ConceptRowHandlers & {
  sectionIndex: number;
  rowIds: string[];
  models: ConceptRowModel[];
  allowedItemTypes: QuoteItemType[];
  onRowRef: (rowId: string, node: HTMLElement | null) => void;
};

/**
 * Desktop: one editable table per section. Each concept is two rows: what it is (Concepto, Tipo,
 * Importe) and how much (Cant., P. unitario, nómina, actions). The rows follow the Tab order.
 */
export function ConceptTable({
  sectionIndex,
  rowIds,
  models,
  allowedItemTypes,
  dispatch,
  onDescriptionRef,
  onRowRef,
}: ConceptTableProps) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table
        aria-label={`Conceptos de la sección ${sectionIndex + 1}`}
        data-testid={`concept-list-${sectionIndex}`}
        className="w-full min-w-[34rem] table-fixed border-collapse text-sm"
      >
        <colgroup>
          <col className="w-8" />
          <col />
          <col className="w-[140px]" />
          <col className="w-[110px]" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs font-medium tracking-wide text-[var(--color-text-muted)]">
            <th className="pb-2" />
            <th scope="col" className="pb-2 font-medium">CONCEPTO</th>
            <th scope="col" className="pb-2 font-medium">TIPO</th>
            <th scope="col" className="pb-2 text-right font-medium">IMPORTE</th>
          </tr>
        </thead>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          {models.map((model) => (
            <ConceptTableRow
              key={model.rowId}
              model={model}
              allowedItemTypes={allowedItemTypes}
              dispatch={dispatch}
              onDescriptionRef={onDescriptionRef}
              onRowRef={onRowRef}
            />
          ))}
        </SortableContext>
      </table>
    </div>
  );
}

function ConceptTableRow({
  model,
  allowedItemTypes,
  dispatch,
  onDescriptionRef,
  onRowRef,
}: Pick<ConceptTableProps, "allowedItemTypes" | "dispatch" | "onDescriptionRef" | "onRowRef"> & { model: ConceptRowModel }) {
  const { rowId, sectionIndex, itemIndex, displayIndex, item, lineTotalCents } = model;
  const handlers = { dispatch, onDescriptionRef };

  return (
    <SortableItem
      id={rowId}
      as="tbody"
      data-testid={`concept-row-${displayIndex}`}
      rowRef={(node) => onRowRef(rowId, node)}
    >
      <tr className="border-t border-[var(--color-border-light)]">
        <td className="pt-2.5 align-top">
          <DragHandle ariaLabel={`Reordenar concepto ${displayIndex + 1}`} focusable={false} className="size-8 shrink-0" />
        </td>
        <td className="py-2 pr-3 align-top">
          <ConceptDescriptionField model={model} mode="table" {...handlers} />
        </td>
        <td className="py-2 pr-3 align-top">
          <input type="hidden" name={`sections.${sectionIndex}.items.${itemIndex}.type`} value={item.type} />
          <ConceptTypeSelect model={model} allowedItemTypes={allowedItemTypes} dispatch={dispatch} />
        </td>
        <td className="py-2 align-top text-right">
          <div className="flex h-9 items-center justify-end">
            <output className="font-semibold tabular-nums" data-testid={`concept-total-${displayIndex}`} aria-label={`Importe del concepto ${displayIndex + 1}`}>
              {formatCents(lineTotalCents ?? 0)}
            </output>
          </div>
        </td>
      </tr>
      <tr>
        <td />
        <td colSpan={3} className="pb-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="text-xs text-[var(--color-text-muted)]">Cant.</span>
            <div className="w-[7.5rem]">
              <ConceptQuantityField model={model} mode="table" dispatch={dispatch} />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">P. unitario</span>
            <div className="w-32">
              <ConceptUnitPriceField
                model={model}
                mode="table"
                dispatch={dispatch}
                onEnter={() => dispatch({ type: "addItem", sectionIndex, itemType: item.type })}
              />
            </div>
            <div className="flex items-center gap-2" data-testid={`payroll-cell-${displayIndex}`}>
              <ConceptPayrollField model={model} mode="table" dispatch={dispatch} />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Duplicar concepto ${displayIndex + 1}`}
                title="Duplicar"
                onClick={() => dispatch({ type: "duplicateItem", sectionIndex, itemIndex })}
              >
                <Icon name="copy" className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Eliminar concepto ${displayIndex + 1}`}
                title="Eliminar"
                onClick={() => dispatch({ type: "removeItem", sectionIndex, itemIndex })}
                className="text-[var(--color-status-danger-fg)] hover:bg-[var(--color-status-danger-bg)]"
              >
                <Icon name="trash" className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </td>
      </tr>
    </SortableItem>
  );
}
