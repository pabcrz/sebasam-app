"use client";

import { Badge } from "@/components/ui";
import { ListChecks, NotebookText, Truck, UserRound } from "lucide-react";
import { formatCents } from "@/features/quotes/lib/format";
import { formatQuantity, itemTypeLabels, ItemFormValue } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";

export interface QuoteSummaryCardProps {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  description: string;
  administrative: boolean;
  items: ItemFormValue[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function QuoteSummaryCard({
  customerName,
  vehicle,
  description,
  administrative,
  items,
  subtotalCents,
  taxCents,
  totalCents,
}: QuoteSummaryCardProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-customer-icon" />
          <div>
            <h3 className="font-semibold text-[var(--color-text-main)]">Cliente</h3>
            <p data-testid="summary-customer" className="text-sm text-[var(--color-text-main)]">{customerName || "Sin cliente seleccionado"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-vehicle-icon" />
          <div>
            <h3 className="font-semibold text-[var(--color-text-main)]">Unidad</h3>
            <p data-testid="summary-vehicle" className="text-sm text-[var(--color-text-muted)]">
              {[vehicle.brand, vehicle.model, vehicle.year, vehicle.plate].filter(Boolean).join(" · ") || "Sin datos de vehículo"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]"><ListChecks className="size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-items-icon" />Conceptos</h3>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
        ) : (
          <ul className="grid gap-2 divide-y divide-gray-300">
            {items.map((item, index) => {
              const quantityNum = Number(item.quantity);
              const lineTotalCents = Math.round(quantityNum * Number(item.unitPrice) * 100);

              return (
                <li
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm text-[var(--color-text-main)]"
                >
                  <span className="grid gap-1">
                    <span className="font-medium">{item.description}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]"><Badge variant="default">{itemTypeLabels[item.type]}</Badge>{formatQuantity(item.quantity)} × {formatCents(Number(item.unitPrice) * 100)}</span>
                  </span>
                  <strong className="whitespace-nowrap text-right text-[var(--color-text-main)]">
                    {formatCents(lineTotalCents)}
                  </strong>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]"><NotebookText className="size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-notes-icon" />Notas</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{description || "Sin notas adicionales."}</p>
        {administrative ? <Badge variant="info">Administrativa</Badge> : null}
      </div>

      <QuoteTotalsCard subtotalCents={subtotalCents} taxCents={taxCents} totalCents={totalCents} />
    </div>
  );
}
