"use client";

import { Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/features/quotes/lib/format";
import { formatQuantity, itemTypeLabels, ItemFormValue, SectionFormValue } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";

export interface QuoteSummaryCardProps {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  /** Sections with items. Pass `sections` from the builder. */
  sections: SectionFormValue[];
  subtotalCents: number;
  discountCents?: number;
  taxCents: number;
  totalCents: number;
}

function ItemRow({ item, index }: { item: ItemFormValue; index: number }) {
  const quantityNum = Number(item.quantity);
  const lineTotalCents = Math.round(quantityNum * Number(item.unitPrice) * 100);
  return (
    <li
      key={index}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm text-[var(--color-text-main)]"
    >
      <span className="grid gap-1">
        <span className="font-medium">{item.description}</span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Badge variant="default">{itemTypeLabels[item.type]}</Badge>
          {formatQuantity(item.quantity)} × {formatCents(Number(item.unitPrice) * 100)}
        </span>
      </span>
      <strong className="whitespace-nowrap text-right text-[var(--color-text-main)]">
        {formatCents(lineTotalCents)}
      </strong>
    </li>
  );
}

export function QuoteSummaryCard({
  customerName,
  vehicle,
  title,
  description,
  administrative,
  sections,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
}: QuoteSummaryCardProps) {
  const hasMultipleSections = sections.length > 1;
  let globalIndex = 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <div className="flex items-start gap-3">
          <Icon name="driver" className="mt-0.5 size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-customer-icon" />
          <div>
            <h3 className="font-semibold text-[var(--color-text-main)]">Cliente</h3>
            <p data-testid="summary-customer" className="text-sm text-[var(--color-text-main)]">{customerName || "Sin cliente seleccionado"}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Icon name="jobs" className="mt-0.5 size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-vehicle-icon" />
          <div>
            <h3 className="font-semibold text-[var(--color-text-main)]">Unidad</h3>
            <p data-testid="summary-vehicle" className="text-sm text-[var(--color-text-muted)]">
              {[vehicle.brand, vehicle.model, vehicle.year, vehicle.plate].filter(Boolean).join(" · ") || "Sin datos de vehículo"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]">
          <Icon name="list-checks" className="size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-items-icon" />
          Conceptos
        </h3>

        {sections.every((s) => s.items.length === 0) ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
        ) : (
          <div className="grid gap-4">
            {sections.map((section, sIndex) => {
              const completeItems = section.items.filter(
                (item) => item.description.trim() && Number(item.unitPrice) >= 0,
              );
              if (completeItems.length === 0) return null;
              return (
                <div key={sIndex}>
                  {hasMultipleSections && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      {section.name || `Sección ${sIndex + 1}`}
                    </p>
                  )}
                  <ul className="grid gap-0 divide-y divide-[var(--color-border-light)]">
                    {completeItems.map((item) => {
                      const idx = globalIndex++;
                      return <ItemRow key={idx} item={item} index={idx} />;
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
        <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text-main)]">
          <Icon name="notes" className="size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="summary-notes-icon" />
          Notas
        </h3>
        <p className="text-sm text-[var(--color-text-main)]">{title || "Sin título"}</p>
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
        {administrative ? <Badge variant="info">Administrativa</Badge> : null}
      </div>

      <QuoteTotalsCard subtotalCents={subtotalCents} discountCents={discountCents} taxCents={taxCents} totalCents={totalCents} />
    </div>
  );
}
