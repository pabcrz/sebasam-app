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
  onTypeRef: (rowId: string, node: HTMLElement | null) => void;
  onRowRef: (rowId: string, node: HTMLElement | null) => void;
};

/** Desktop: one editable table per section. Columns follow the Tab order of the fields. */
export function ConceptTable({
  sectionIndex,
  rowIds,
  models,
  allowedItemTypes,
  dispatch,
  onDescriptionRef,
  onTypeRef,
  onRowRef,
}: ConceptTableProps) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table aria-label={`Conceptos de la sección ${sectionIndex + 1}`} className="w-full min-w-[52rem] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-8" />
          <col className="w-36" />
          <col />
          <col className="w-36" />
          <col className="w-36" />
          <col className="w-16" />
          <col className="w-28" />
          <col className="w-24" />
        </colgroup>
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            <th className="pb-2" />
            <th scope="col" className="pb-2 font-medium">Tipo</th>
            <th scope="col" className="pb-2 font-medium">Descripción</th>
            <th scope="col" className="pb-2 font-medium">Cant.</th>
            <th scope="col" className="pb-2 font-medium">Precio</th>
            <th scope="col" className="pb-2 font-medium">Nóm.</th>
            <th scope="col" className="pb-2 text-right font-medium">Importe</th>
            <th scope="col" className="pb-2"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <tbody data-testid={`concept-list-${sectionIndex}`}>
            {models.map((model) => (
              <ConceptTableRow
                key={model.rowId}
                model={model}
                allowedItemTypes={allowedItemTypes}
                dispatch={dispatch}
                onDescriptionRef={onDescriptionRef}
                onTypeRef={onTypeRef}
                onRowRef={onRowRef}
              />
            ))}
          </tbody>
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
  onTypeRef,
  onRowRef,
}: Pick<ConceptTableProps, "allowedItemTypes" | "dispatch" | "onDescriptionRef" | "onTypeRef" | "onRowRef"> & { model: ConceptRowModel }) {
  const { rowId, sectionIndex, itemIndex, displayIndex, item, lineTotalCents } = model;
  const handlers = { dispatch, onDescriptionRef };

  return (
    <SortableItem
      id={rowId}
      as="tr"
      className="align-top"
      data-testid={`concept-row-${displayIndex}`}
      rowRef={(node) => onRowRef(rowId, node)}
    >
      <td className="pt-2.5">
        <DragHandle ariaLabel={`Reordenar concepto ${displayIndex + 1}`} focusable={false} className="size-8 shrink-0" />
      </td>
      <td className="py-2 pr-3">
        <input type="hidden" name={`sections.${sectionIndex}.items.${itemIndex}.type`} value={item.type} />
        <ConceptTypeSelect model={model} allowedItemTypes={allowedItemTypes} dispatch={dispatch} onTypeRef={onTypeRef} />
      </td>
      <td className="py-2 pr-3">
        <ConceptDescriptionField model={model} mode="table" {...handlers} />
      </td>
      <td className="py-2 pr-3">
        <ConceptQuantityField model={model} mode="table" dispatch={dispatch} />
      </td>
      <td className="py-2 pr-3">
        <ConceptUnitPriceField
          model={model}
          mode="table"
          dispatch={dispatch}
          onEnter={() => dispatch({ type: "addItem", sectionIndex, itemType: item.type })}
        />
      </td>
      <td className="py-2 pr-3 pt-3" data-testid={`payroll-cell-${displayIndex}`}>
        <ConceptPayrollField model={model} mode="table" dispatch={dispatch} />
      </td>
      <td className="py-2 pr-3 pt-3 text-right">
        <output className="font-medium tabular-nums" data-testid={`concept-total-${displayIndex}`} aria-label={`Importe del concepto ${displayIndex + 1}`}>
          {lineTotalCents === null ? "Pendiente" : formatCents(lineTotalCents)}
        </output>
      </td>
      <td className="py-2 pt-1.5">
        <div className="flex items-center justify-end gap-1">
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
      </td>
    </SortableItem>
  );
}
