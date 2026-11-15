"use client";

import * as React from "react";
import { QuoteItemType } from "@/generated/prisma/enums";
import { Icon } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
} from "@/components/ui";
import { itemTypes, SectionFormValue } from "./quote-builder-shared";
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
import { SortableSection, DragHandle } from "./quote-builder-dnd";
import { QuoteTotalsCard } from "./quote-totals-card";
import type { QuoteBuilderItemsAction } from "./quote-builder-state";
import { buildConceptRowModel, ConceptAddChips } from "./quote-builder-concept-fields";
import { MobileConceptRow } from "./quote-builder-concept-mobile";
import { ConceptTable } from "./quote-builder-concept-table";
import { useIsConceptTableLayout } from "./use-media-query";

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
  onRowRef: (rowId: string, node: HTMLElement | null) => void;
  onDescriptionRef: (rowId: string, node: HTMLInputElement | null) => void;
  /** Table layout: the row's Tipo control is its first field, so new rows focus it. */
  onTypeRef: (rowId: string, node: HTMLElement | null) => void;
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
  focus: { animatedRowId, expandedItemRowId, onToggleItem, onRowRef, onDescriptionRef, onTypeRef },
  allowedItemTypes = itemTypes,
}: QuoteBuilderItemsStepProps) {
  // One layout at a time: the mobile list and the desktop table render different inputs, so
  // only one set of concept fields is mounted. State lives in the reducer, so resizing keeps it.
  const isTableLayout = useIsConceptTableLayout();
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

  function renderConcepts(sectionIndex: number, section: SectionFormValue) {
    const models = section.rowIds.map((rowId, itemIndex) => buildConceptRowModel(sections, sectionIndex, itemIndex, rowId));

    if (isTableLayout) {
      return (
        <ConceptTable
          sectionIndex={sectionIndex}
          rowIds={section.rowIds}
          models={models}
          allowedItemTypes={allowedItemTypes}
          dispatch={dispatch}
          onDescriptionRef={onDescriptionRef}
          onTypeRef={onTypeRef}
          onRowRef={onRowRef}
        />
      );
    }

    return (
      <SortableContext items={section.rowIds} strategy={verticalListSortingStrategy}>
        <div className="grid min-w-0" data-testid={`concept-list-${sectionIndex}`}>
          {models.map((model) => (
            <MobileConceptRow
              key={model.rowId}
              model={model}
              allowedItemTypes={allowedItemTypes}
              isExpanded={expandedItemRowId === model.rowId}
              animated={animatedRowId === model.rowId}
              dispatch={dispatch}
              onDescriptionRef={onDescriptionRef}
              onToggle={onToggleItem}
              onRowRef={onRowRef}
            />
          ))}
        </div>
      </SortableContext>
    );
  }

  return (
    <section className="grid min-w-0 gap-3 px-1.5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
      <div className="grid min-w-0 gap-3">
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
                  className="grid min-w-0 gap-3 lg:rounded-[var(--radius-lg)] lg:border lg:border-[var(--color-border-light)] lg:p-3"
                  data-testid={`section-${sectionIndex}`}
                >
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
                        <Icon name="trash" className="size-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>

                  {renderConcepts(sectionIndex, section)}

                  <ConceptAddChips sectionIndex={sectionIndex} allowedItemTypes={allowedItemTypes} dispatch={dispatch} />
                </div>
              </SortableSection>
            ))}
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "addSection" })}
          className="flex items-center gap-2 self-start"
        >
          <Icon name="plus-circle" className="size-4" aria-hidden="true" />
          Agregar sección
        </Button>
      </div>

      <aside data-testid="quote-summary-column" className="grid min-w-0 content-start gap-3 lg:sticky lg:top-0">
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
      </aside>
    </section>
  );
}
