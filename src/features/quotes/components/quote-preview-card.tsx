"use client";

import { Badge } from "@/components/ui";
import { ListChecks, NotebookText, Truck, UserRound } from "lucide-react";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { formatQuantity, itemTypeLabels, ItemFormValue, SectionFormValue } from "./quote-builder-shared";
import { QuoteTotalsCard } from "./quote-totals-card";
import { QuotePaymentBalanceIndicator } from "./quote-payment-balance-indicator";

export interface QuotePreviewCardProps {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  sections: SectionFormValue[];
  subtotalCents: number;
  discountCents?: number;
  taxCents: number;
  totalCents: number;
  paidCents?: number;
  remainingCents?: number;
  validUntil: Date | null;
}

function PreviewItemRow({ item, index }: { item: ItemFormValue; index: number }) {
  const quantityNum = Number(item.quantity);
  const lineTotalCents = Math.round(quantityNum * Number(item.unitPrice) * 100);
  return (
    <li
      key={index}
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[var(--color-border-light)] pb-3 text-sm text-[var(--color-text-main)] last:border-0 last:pb-0"
    >
      <span className="grid gap-1">
        <span className="font-medium">{item.description}</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {itemTypeLabels[item.type]} · {formatQuantity(item.quantity)} × {formatCents(Number(item.unitPrice) * 100)}
        </span>
      </span>
      <strong className="whitespace-nowrap text-right text-[var(--color-text-main)]">
        {formatCents(lineTotalCents)}
      </strong>
    </li>
  );
}

export function QuotePreviewCard({
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
  paidCents,
  remainingCents,
  validUntil,
}: QuotePreviewCardProps) {
  const vehicleDescription = [vehicle.brand, vehicle.model, vehicle.year, vehicle.plate]
    .filter(Boolean)
    .join(" · ");

  const hasMultipleSections = sections.length > 1;
  let globalIndex = 0;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm">
      <div className="bg-[image:var(--gradient-primary)] px-5 py-4 text-white">
        <h2 className="text-xl font-bold leading-tight">{title || "Sin título"}</h2>
      </div>
      <div className="grid gap-4 p-4">
        <div className="grid grid-cols-[auto_1fr] gap-x-3">
          <UserRound className="row-span-2 size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="preview-customer-icon" />
          <p className="text-xs font-medium text-[var(--color-text-muted)]">CLIENTE</p>
          <p className="text-sm font-medium text-[var(--color-text-main)]">{customerName || "Sin cliente"}</p>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3">
          <Truck className="row-span-2 size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="preview-vehicle-icon" />
          <p className="text-xs font-medium text-[var(--color-text-muted)]">UNIDAD</p>
          <p className="text-sm text-[var(--color-text-main)]">{vehicleDescription || "Sin vehículo"}</p>
        </div>
        {administrative ? <Badge variant="info">Cotización administrativa</Badge> : null}
        {description ? <p className="flex items-start gap-3 text-sm text-[var(--color-text-muted)]"><NotebookText className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" data-testid="preview-notes-icon" />{description}</p> : null}

        <div className="grid gap-2">
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
            <ListChecks className="size-5 text-[var(--color-primary)]" aria-hidden="true" data-testid="preview-items-icon" />
            CONCEPTOS
          </p>

          {sections.every((s) => s.items.length === 0) ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
          ) : (
            <div className="grid gap-3">
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
                    <ul className="grid gap-0">
                      {completeItems.map((item) => {
                        const idx = globalIndex++;
                        return <PreviewItemRow key={idx} item={item} index={idx} />;
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <QuoteTotalsCard subtotalCents={subtotalCents} discountCents={discountCents} taxCents={taxCents} totalCents={totalCents} />
        <QuotePaymentBalanceIndicator paidCents={paidCents} remainingCents={remainingCents} />

        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text-muted)]">
          <p data-testid="quote-validity">
            Vigente hasta el {validUntil ? formatDate(validUntil) : "—"}. Los precios están sujetos a cambios imprevistos
            en el costo de materiales.
          </p>
        </div>
      </div>
    </div>
  );
}
