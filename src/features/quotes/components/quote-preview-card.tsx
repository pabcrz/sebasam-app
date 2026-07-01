"use client";

import { Badge } from "@/components/ui";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { formatQuantity, itemTypeLabels, ItemFormValue } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";

export interface QuotePreviewCardProps {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  items: ItemFormValue[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  validUntil: Date;
}

export function QuotePreviewCard({
  customerName,
  vehicle,
  title,
  description,
  administrative,
  items,
  subtotalCents,
  taxCents,
  totalCents,
  validUntil,
}: QuotePreviewCardProps) {
  const vehicleDescription = [vehicle.brand, vehicle.model, vehicle.year, vehicle.plate]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm">
      <div className="bg-[image:var(--gradient-primary)] px-5 py-4 text-white">
        <p className="text-xs font-medium opacity-90">Vista previa de cotización</p>
        <p className="text-lg font-bold">{title || "Sin título"}</p>
      </div>
      <div className="grid gap-4 p-4">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">CLIENTE</p>
          <p className="text-sm font-medium text-[var(--color-text-main)]">{customerName || "Sin cliente"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">UNIDAD</p>
          <p className="text-sm text-[var(--color-text-main)]">{vehicleDescription || "Sin vehículo"}</p>
        </div>
        {administrative ? <Badge variant="info">Cotización administrativa</Badge> : null}
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}

        <div className="grid gap-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">CONCEPTOS</p>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
          ) : (
            <ul className="grid gap-2">
              {items.map((item, index) => {
                const quantityNum = Number(item.quantity);
                const lineTotalCents = Math.round(quantityNum * Number(item.unitPrice) * 100);

                return (
                  <li
                    key={index}
                    className="flex items-start justify-between gap-3 border-b border-[var(--color-border-light)] pb-2 text-sm text-[var(--color-text-main)] last:border-0 last:pb-0"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      {quantityNum > 1 ? (
                        <span className="font-medium">{formatQuantity(item.quantity)}×</span>
                      ) : null}
                      <Badge variant="default">{itemTypeLabels[item.type]}</Badge>
                      {item.description}
                    </span>
                    <span className="whitespace-nowrap text-[var(--color-text-muted)]">
                      {formatCents(lineTotalCents)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <QuoteTotalsCard subtotalCents={subtotalCents} taxCents={taxCents} totalCents={totalCents} />

        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text-muted)]">
          <p data-testid="quote-validity">
            Vigente hasta el {formatDate(validUntil)}. Los precios están sujetos a cambios imprevistos
            en el costo de materiales.
          </p>
        </div>
      </div>
    </div>
  );
}
