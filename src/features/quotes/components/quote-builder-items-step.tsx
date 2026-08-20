"use client";

import { QuoteItemType } from "@prisma/client";
import { Copy, Minus, Plus, Trash2, PlusCircle } from "lucide-react";
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
  ItemFormValue,
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
export interface QuoteBuilderItemsStepProps {
  sections: SectionFormValue[];
  animatedRowId: string | null;
  completeItemsCount: number;
  taxEnabled: boolean;
  discount: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  onAddItem: (sectionIndex: number, type: QuoteItemType) => void;
  onRemoveItem: (sectionIndex: number, itemIndex: number) => void;
  onDuplicateItem: (sectionIndex: number, itemIndex: number) => void;
  onUpdateItem: (sectionIndex: number, itemIndex: number, patch: Partial<ItemFormValue>) => void;
  onAdjustQuantity: (sectionIndex: number, itemIndex: number, delta: number) => void;
  onAddSection: () => void;
  onRemoveSection: (sectionIndex: number) => void;
  onUpdateSectionName: (sectionIndex: number, name: string) => void;
  onTaxEnabledChange: (taxEnabled: boolean) => void;
  onDiscountChange: (discount: string) => void;
  onReorderSection: (oldIndex: number, newIndex: number) => void;
  onReorderItem: (activeSectionIndex: number, activeItemIndex: number, overSectionIndex: number, overItemIndex: number) => void;
  onRowRef: (rowId: string, node: HTMLDivElement | null) => void;
  onDescriptionRef: (rowId: string, node: HTMLInputElement | null) => void;
}

export function QuoteBuilderItemsStep({
  sections,
  animatedRowId,
  completeItemsCount,
  taxEnabled,
  discount,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  onAddItem,
  onRemoveItem,
  onDuplicateItem,
  onUpdateItem,
  onAdjustQuantity,
  onAddSection,
  onRemoveSection,
  onUpdateSectionName,
  onTaxEnabledChange,
  onDiscountChange,
  onReorderSection,
  onReorderItem,
  onRowRef,
  onDescriptionRef,
}: QuoteBuilderItemsStepProps) {
  // Offset for display numbering across sections

  const sensors = useSensors(
    useSensor(PointerSensor),
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
          onReorderSection(oldIndex, newIndex);
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
          onReorderItem(activeSectionIndex, activeItemIndex, overSectionIndex, overItemIndex);
        }
      }
    }
  }

  return (
    <section className="grid gap-6">
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
                className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-light)] p-3"
                data-testid={`section-${sectionIndex}`}
              >
                {/* Section header */}
                <div className="flex flex-wrap items-center gap-2">
                  <DragHandle className="size-4 shrink-0 text-[var(--color-text-muted)] touch-none cursor-grab" />
                  <div className="flex min-w-0 flex-1 basis-48 items-center gap-2">
                    <Input
                      aria-label={`Nombre de la sección ${sectionIndex + 1}`}
                placeholder="Nombre de la sección (ej. Parte delantera)"
                value={section.name}
                onChange={(e) => onUpdateSectionName(sectionIndex, e.target.value)}
                className="h-8 border-0 bg-transparent p-0 text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                name={`sections.${sectionIndex}.name`}
              />
            </div>

            {sections.length > 1 ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                aria-label={`Eliminar sección ${sectionIndex + 1}`}
                onClick={() => onRemoveSection(sectionIndex)}
                className="size-8 shrink-0"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {/* Items in this section */}
          <SortableContext items={section.rowIds} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3" data-testid={`concept-list-${sectionIndex}`}>
              {section.items.map((item, itemIndex) => {
                const rowId = section.rowIds[itemIndex]!;
                const displayIndex = sections
                  .slice(0, sectionIndex)
                  .reduce((acc, s) => acc + s.items.length, 0) + itemIndex;
                const itemErrors = validateItemFields(item, displayIndex, true);
                const unitPrice = Number(item.unitPrice);
                const lineTotalCents = item.unitPrice.trim() !== "" && Number.isFinite(unitPrice)
                  ? Math.round(Number(item.quantity) * unitPrice * 100)
                  : null;
                const typeQuantityLimit = getMaxQuantityForType(item.type);
                const fieldId = `sections-${sectionIndex}-items-${itemIndex}`;
                const descriptionErrorId = `${fieldId}-description-error`;
                const quantityErrorId = `${fieldId}-quantity-error`;
                const unitPriceCurrencyId = `${fieldId}-unitPrice-currency`;
                const unitPriceErrorId = `${fieldId}-unitPrice-error`;

                return (
                  <SortableItem key={rowId} id={rowId}>
                    <div
                      ref={(node) => onRowRef(rowId, node)}
                      data-testid={`concept-row-${displayIndex}`}
                      className={`grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4${rowId === animatedRowId ? " motion-safe:animate-fade-in motion-safe:animate-duration-200" : ""}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 basis-44 items-center gap-3">
                          <DragHandle className="size-4 shrink-0 text-[var(--color-text-muted)] touch-none cursor-grab" />
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text-main)]">
                            {displayIndex + 1}
                          </span>
                          <Select
                            value={item.type}
                            onValueChange={(value) => onUpdateItem(sectionIndex, itemIndex, { type: value as QuoteItemType })}
                          >
                            <SelectTrigger className="w-auto min-w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {itemTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {itemTypeLabels[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Duplicar concepto ${displayIndex + 1}`}
                            onClick={() => onDuplicateItem(sectionIndex, itemIndex)}
                            className="size-10"
                          >
                            <Copy aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            aria-label={`Eliminar concepto ${displayIndex + 1}`}
                            onClick={() => onRemoveItem(sectionIndex, itemIndex)}
                            className="size-10"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                  <input type="hidden" name={`sections.${sectionIndex}.items.${itemIndex}.type`} value={item.type} />
                  <div className="grid gap-2">
                    <Label htmlFor={`${fieldId}-description`}>Descripción</Label>
                    <Input
                      ref={(node) => onDescriptionRef(rowId, node)}
                      id={`${fieldId}-description`}
                      name={`sections.${sectionIndex}.items.${itemIndex}.description`}
                      value={item.description}
                      onChange={(event) => onUpdateItem(sectionIndex, itemIndex, { description: event.target.value })}
                      placeholder="Ej. Bajar dos muelles"
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
                      <div className="flex w-full min-w-0 max-w-35 items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)]">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Restar cantidad del concepto ${displayIndex + 1}`}
                          onClick={() => onAdjustQuantity(sectionIndex, itemIndex, -1)}
                          disabled={Number(item.quantity) <= 1}
                          className="h-[var(--tap-min-height)] w-[var(--tap-min-height)] shrink-0 rounded-none border-0 border-r border-[var(--color-border-light)] px-0"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Input
                          id={`${fieldId}-quantity`}
                          name={`sections.${sectionIndex}.items.${itemIndex}.quantity`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={1}
                          className="min-w-0 rounded-none border-0 px-1 text-center shadow-none focus-visible:ring-inset"
                          max={typeQuantityLimit}
                          value={item.quantity}
                          onChange={(event) => {
                            onUpdateItem(sectionIndex, itemIndex, { quantity: event.target.value.replace(/\D/g, "") });
                          }}
                          onBlur={(event) => {
                            const digitsOnly = event.target.value.replace(/\D/g, "");
                            if (digitsOnly === "") return;
                            const clamped = String(Math.min(typeQuantityLimit, Math.max(1, Number(digitsOnly))));
                            onUpdateItem(sectionIndex, itemIndex, { quantity: clamped });
                          }}
                          onWheel={(event) => event.currentTarget.blur()}
                          aria-describedby={itemErrors.quantity ? quantityErrorId : undefined}
                          aria-invalid={itemErrors.quantity ? true : undefined}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Sumar cantidad del concepto ${displayIndex + 1}`}
                          onClick={() => onAdjustQuantity(sectionIndex, itemIndex, 1)}
                          disabled={Number(item.quantity) >= typeQuantityLimit}
                          className="h-[var(--tap-min-height)] w-[var(--tap-min-height)] shrink-0 rounded-none border-0 border-l border-[var(--color-border-light)] px-0"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>
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
                      <div className="flex min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]">
                        <span
                          className="flex items-center self-stretch pl-3 pr-1 text-[var(--color-text-muted)]"
                          data-testid={`currency-prefix-${displayIndex}`}
                          aria-hidden="true"
                        >
                          $
                        </span>
                        <Input
                          id={`${fieldId}-unitPrice`}
                          name={`sections.${sectionIndex}.items.${itemIndex}.unitPrice`}
                          type="number"
                          min="0"
                          max={maxUnitPrice}
                          step="0.01"
                          aria-describedby={`${unitPriceCurrencyId}${itemErrors.unitPrice ? ` ${unitPriceErrorId}` : ""}`}
                          aria-invalid={itemErrors.unitPrice ? true : undefined}
                          value={item.unitPrice}
                          onChange={(event) => onUpdateItem(sectionIndex, itemIndex, { unitPrice: event.target.value })}
                          className="min-w-0 border-0 pl-1 shadow-none focus-visible:ring-0"
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
                  <div className="flex items-center justify-between pt-1 text-sm text-[var(--color-text-muted)]">
                    <span>Importe</span>
                    <output className="font-medium" data-testid={`concept-total-${displayIndex}`} aria-label={`Importe del concepto ${displayIndex + 1}`}>
                      {lineTotalCents === null ? "Pendiente" : formatCents(lineTotalCents)}
                    </output>
                  </div>
                  </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>

          {/* Add item buttons for this section */}
          <div className="flex flex-wrap gap-2" aria-label={`Agregar concepto a sección ${sectionIndex + 1}`}>
            {itemTypes.map((type) => (
              <Button key={type} type="button" variant="outline" size="sm" onClick={() => onAddItem(sectionIndex, type)}>
                + {itemTypeLabels[type]}
              </Button>
            ))}
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
        onClick={onAddSection}
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
            onCheckedChange={(checked) => onTaxEnabledChange(checked === true)}
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
              onChange={(event) => onDiscountChange(event.target.value)}
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
