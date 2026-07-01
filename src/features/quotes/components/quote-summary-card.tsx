"use client";

import { Badge } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { formatQuantity, ItemFormValue } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";

export interface QuoteSummaryCardProps {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
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
  title,
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
        <h3 className="font-semibold text-[var(--color-text-main)]">Cliente / Unidad</h3>
        <p data-testid="summary-customer" className="text-sm text-[var(--color-text-main)]">
          {customerName || "Sin cliente seleccionado"}
        </p>
        <p data-testid="summary-vehicle" className="text-sm text-[var(--color-text-muted)]">
          {[vehicle.brand, vehicle.model, vehicle.year, vehicle.plate]
            .filter(Boolean)
            .join(" · ") || "Sin datos de vehículo"}
        </p>
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <h3 className="font-semibold text-[var(--color-text-main)]">Conceptos</h3>
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
                  className="flex items-start justify-between gap-3 py-2 text-sm text-[var(--color-text-main)]"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    {item.description}
                    <span className=" text-text-muted">Precio unitario: {formatCents(Number(item.unitPrice) * 100)} x {formatQuantity(item.quantity)}</span>
                  </span>
                  <span className="whitespace-nowrap text-text-muted">
                    {formatCents(lineTotalCents)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <h3 className="font-semibold text-[var(--color-text-main)]">Notas</h3>
        <p className="text-sm text-[var(--color-text-main)]">{title || "Sin título"}</p>
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
        {administrative ? <Badge variant="info">Administrativa</Badge> : null}
      </div>

      <QuoteTotalsCard subtotalCents={subtotalCents} taxCents={taxCents} totalCents={totalCents} />
    </div>
  );
}
