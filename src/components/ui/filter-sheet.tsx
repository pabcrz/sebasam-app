"use client";

import * as React from "react";
import { Button } from "./button";
import { Chip, ChipRow } from "./chip";
import {
  DialogContent,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
} from "./dialog";
import { Icon } from "./icon";

export interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Filter fields. */
  children: React.ReactNode;
  /** Number of results the current filters produce; shown in the apply button. */
  resultCount: number;
  onClear: () => void;
  /** Runs before the sheet closes from "Ver N resultados". */
  onApply?: () => void;
}

/** Advanced filters in a Sheet: fields, then "Limpiar" (left) and "Ver N resultados" (right). */
export function FilterSheet({
  open,
  onOpenChange,
  title = "Filtros",
  children,
  resultCount,
  onClear,
  onApply,
}: FilterSheetProps) {
  const resultLabel = resultCount === 1 ? "resultado" : "resultados";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet">
        <DialogMobileHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">Ajusta los filtros de la lista</DialogDescription>
          <DialogMobileClose />
        </DialogMobileHeader>
        <DialogMobileBody>{children}</DialogMobileBody>
        <DialogMobileFooter>
          <Button type="button" variant="secondary" onClick={onClear}>
            Limpiar
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply?.();
              onOpenChange(false);
            }}
          >
            {`Ver ${resultCount} ${resultLabel}`}
          </Button>
        </DialogMobileFooter>
      </DialogContent>
    </Sheet>
  );
}

export type ActiveFilterChip = {
  id: string;
  label: string;
};

export interface ActiveFilterChipsProps {
  filters: ActiveFilterChip[];
  /** Called with the id of the chip the user removed. */
  onRemove: (id: string) => void;
}

/** Active filters as removable chips in one scrollable row. Renders nothing when there are none. */
export function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <ChipRow label="Filtros activos">
      {filters.map((filter) => (
        <Chip
          key={filter.id}
          pressed
          aria-label={`Quitar filtro: ${filter.label}`}
          onClick={() => onRemove(filter.id)}
        >
          {filter.label}
          <Icon name="close" className="h-3.5 w-3.5" aria-hidden="true" />
        </Chip>
      ))}
    </ChipRow>
  );
}
