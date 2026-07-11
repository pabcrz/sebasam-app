"use client";

import { QuoteItemType } from "@prisma/client";
import { Copy, Minus, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
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
  maxQuantity,
  maxUnitPrice,
  getMaxQuantityForType,
  validateItemValue,
} from "./quote-builder-shared";
import { formatCents } from "@/features/quotes/lib/format";

export interface QuoteBuilderItemsStepProps {
  items: ItemFormValue[];
  showItemValidation: boolean;
  completeItemsCount: number;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onDuplicateItem: (index: number) => void;
  onUpdateItem: (index: number, patch: Partial<ItemFormValue>) => void;
  onAdjustQuantity: (index: number, delta: number) => void;
}

export function QuoteBuilderItemsStep({
  items,
  showItemValidation,
  completeItemsCount,
  onAddItem,
  onRemoveItem,
  onDuplicateItem,
  onUpdateItem,
  onAdjustQuantity,
}: QuoteBuilderItemsStepProps) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-main)]">Conceptos</h3>
        {completeItemsCount > 0 ? (
          <Badge variant="info">{completeItemsCount} completos</Badge>
        ) : null}
      </div>

      {items.map((item, index) => {
        const itemError = showItemValidation ? validateItemValue(item, index) : null;
        const lineTotalCents = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100);
        const typeQuantityLimit = getMaxQuantityForType(item.type);

        return (
          <div
            key={index}
            className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text-main)]">
                  {index + 1}
                </span>
                <Select
                  value={item.type}
                  onValueChange={(value) => onUpdateItem(index, { type: value as QuoteItemType })}
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
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Duplicar concepto ${index + 1}`}
                  onClick={() => onDuplicateItem(index)}
                  className="size-10"
                >
                  <Copy aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  aria-label={`Eliminar concepto ${index + 1}`}
                  onClick={() => onRemoveItem(index)}
                  className="size-10"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <input type="hidden" name={`items.${index}.type`} value={item.type} />
            <div className="grid gap-2">
              <Label htmlFor={`items-${index}-description`}>Descripción</Label>
              <Input
                id={`items-${index}-description`}
                name={`items.${index}.description`}
                value={item.description}
                onChange={(event) => onUpdateItem(index, { description: event.target.value })}
                placeholder="Ej. Bajar dos muelles"
              />
            </div>
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-3"
              data-testid={`quantity-price-row-${index}`}
            >
              <div className="grid min-w-0 gap-2">
                <Label htmlFor={`items-${index}-quantity`}>Cantidad</Label>
                <div className="flex w-full min-w-0 max-w-35 items-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Restar cantidad del concepto ${index + 1}`}
                    onClick={() => onAdjustQuantity(index, -1)}
                    disabled={Number(item.quantity) <= 1}
                    className="h-[var(--tap-min-height)] w-[var(--tap-min-height)] shrink-0 rounded-none border-0 border-r border-[var(--color-border-light)] px-0"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Input
                    id={`items-${index}-quantity`}
                    name={`items.${index}.quantity`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    className="min-w-0 rounded-none border-0 px-1 text-center shadow-none focus-visible:ring-inset"
                    max={typeQuantityLimit}
                    value={item.quantity}
                    onChange={(event) => {
                      onUpdateItem(index, { quantity: event.target.value.replace(/\D/g, "") });
                    }}
                    onBlur={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "");
                      if (digitsOnly === "") return;
                      const clamped = String(Math.min(typeQuantityLimit, Math.max(1, Number(digitsOnly))));
                      onUpdateItem(index, { quantity: clamped });
                    }}
                    onWheel={(event) => event.currentTarget.blur()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Sumar cantidad del concepto ${index + 1}`}
                    onClick={() => onAdjustQuantity(index, 1)}
                    disabled={Number(item.quantity) >= typeQuantityLimit}
                    className="h-[var(--tap-min-height)] w-[var(--tap-min-height)] shrink-0 rounded-none border-0 border-l border-[var(--color-border-light)] px-0"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor={`items-${index}-unitPrice`}>Precio unitario</Label>
                <span id={`items-${index}-unitPrice-currency`} className="sr-only">
                  Importe en pesos mexicanos.
                </span>
                <div className="flex min-w-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-focus-ring)]">
                  <span
                    className="flex items-center self-stretch pl-3 pr-1 text-[var(--color-text-muted)]"
                    data-testid={`currency-prefix-${index}`}
                    aria-hidden="true"
                  >
                    $
                  </span>
                  <Input
                    id={`items-${index}-unitPrice`}
                    name={`items.${index}.unitPrice`}
                    type="number"
                    min="0"
                    max={maxUnitPrice}
                    step="0.01"
                    aria-describedby={`items-${index}-unitPrice-currency`}
                    value={item.unitPrice}
                    onChange={(event) => onUpdateItem(index, { unitPrice: event.target.value })}
                    className="min-w-0 border-0 pl-1 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-3">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">Importe</span>
              <strong className="text-lg text-[var(--color-text-main)]" data-testid={`concept-total-${index}`}>
                {formatCents(Number.isFinite(lineTotalCents) ? lineTotalCents : 0)}
              </strong>
            </div>
            {itemError ? (
              <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-sm text-[var(--color-status-danger-fg)]" role="status" aria-live="polite">
                {itemError}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        onClick={onAddItem}
        className="w-full"
      >
        + Agregar concepto
      </Button>
    </section>
  );
}
