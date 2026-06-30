"use client";

import { QuoteItemType } from "@prisma/client";
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { itemTypeLabels, itemTypes, ItemFormValue, maxQuantity, maxUnitPrice, validateItemValue } from "./quote-builder-shared";

export interface QuoteBuilderItemsStepProps {
  items: ItemFormValue[];
  showItemValidation: boolean;
  completeItemsCount: number;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, patch: Partial<ItemFormValue>) => void;
  onAdjustQuantity: (index: number, delta: number) => void;
}

export function QuoteBuilderItemsStep({
  items,
  showItemValidation,
  completeItemsCount,
  onAddItem,
  onRemoveItem,
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

        return (
          <div
            key={index}
            className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-2 py-4"
          >
            <div className="flex items-center justify-between gap-4">
              <Select
                value={item.type}
                onValueChange={(value) => onUpdateItem(index, { type: value as QuoteItemType })}
              >
                <SelectTrigger className="w-auto min-w-39">
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
              <Button
                type="button"
                variant="ghost"
                aria-label={`Eliminar concepto ${index + 1}`}
                onClick={() => onRemoveItem(index)}
                className="h-8 w-8 p-0 text-[var(--color-status-danger-fg)] hover:bg-[var(--color-status-danger-bg)]"
              >
                ✕
              </Button>
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
            <div className="flex gap-3">
              <div className="grid gap-2">
                <Label htmlFor={`items-${index}-quantity`}>Cantidad</Label>
                <div className="flex items-center gap-2 max-w-35">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Restar cantidad del concepto ${index + 1}`}
                    onClick={() => onAdjustQuantity(index, -1)}
                    disabled={Number(item.quantity) <= 1}
                    className="h-[var(--tap-min-height)] w-[var(--tap-min-height)] px-0"
                  >
                    −
                  </Button>
                  <Input
                    id={`items-${index}-quantity`}
                    name={`items.${index}.quantity`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    className="text-center"
                    max={maxQuantity}
                    value={item.quantity}
                    onChange={(event) => {
                      onUpdateItem(index, { quantity: event.target.value.replace(/\D/g, "") });
                    }}
                    onBlur={(event) => {
                      const digitsOnly = event.target.value.replace(/\D/g, "");
                      if (digitsOnly === "") return;
                      const clamped = String(Math.min(maxQuantity, Math.max(1, Number(digitsOnly))));
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
                    disabled={Number(item.quantity) >= maxQuantity}
                    className="h-[var(--tap-min-height)] w-[var(--tap-min-height)] px-0"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`items-${index}-unitPrice`}>Precio unitario</Label>
                <Input
                  id={`items-${index}-unitPrice`}
                  name={`items.${index}.unitPrice`}
                  type="number"
                  min="0"
                  max={maxUnitPrice}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(event) => onUpdateItem(index, { unitPrice: event.target.value })}
                />
              </div>
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
