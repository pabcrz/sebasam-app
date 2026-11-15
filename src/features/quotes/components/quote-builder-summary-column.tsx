"use client";

import * as React from "react";
import { Input, Label, Switch } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { formatAmountInWords } from "@/features/quotes/lib/amount-in-words";

export type QuoteBuilderChecklistItem = { label: string; done: boolean };

export interface QuoteBuilderSummaryColumnProps {
  /** Id of the quote form: the controls below render outside it, so they submit through `form`. */
  formId: string;
  customerName: string | null;
  unitLine: string | null;
  driverName: string | null;
  taxEnabled: boolean;
  discount: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  onTaxEnabledChange: (taxEnabled: boolean) => void;
  onDiscountChange: (discount: string) => void;
  /** Readiness list shown on the last step only; null hides it. */
  checklist: QuoteBuilderChecklistItem[] | null;
  /** Primary action of the current step: next step, or the create button on the last step. */
  primaryAction: React.ReactNode;
}

function TotalRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-3 whitespace-nowrap text-sm text-[var(--color-text-muted)]">
      <span>{label}</span>
      <span data-testid={testId} className="tabular-nums">{value}</span>
    </div>
  );
}

/** Desktop quote flow summary (≥ lg): client, totals, tax and discount, readiness and the primary action. */
export function QuoteBuilderSummaryColumn({
  formId,
  customerName,
  unitLine,
  driverName,
  taxEnabled,
  discount,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  onTaxEnabledChange,
  onDiscountChange,
  checklist,
  primaryAction,
}: QuoteBuilderSummaryColumnProps) {
  return (
    <div data-testid="quote-builder-summary" className="grid min-w-0 content-start gap-5">
      <div className="grid gap-1">
        {customerName ? <p className="font-semibold text-[var(--color-text-main)]">{customerName}</p> : null}
        {unitLine ? <p className="text-sm text-[var(--color-text-muted)]">{unitLine}</p> : null}
        {driverName ? <p className="text-sm text-[var(--color-text-muted)]">Chofer · {driverName}</p> : null}
        {!customerName && !unitLine ? <p className="text-sm text-[var(--color-text-muted)]">Sin cliente ni unidad</p> : null}
      </div>

      <div className="grid gap-3 border-t border-[var(--color-border-light)] pt-4">
        <div className="grid gap-2">
          <TotalRow label="Subtotal" value={formatCents(subtotalCents)} testId="quote-subtotal" />
          {discountCents > 0 ? (
            <TotalRow label="Descuento" value={`-${formatCents(discountCents)}`} testId="quote-discount" />
          ) : null}
          <TotalRow label="IVA (16%)" value={formatCents(taxCents)} testId="quote-tax" />
        </div>
        <div className="flex items-baseline justify-between gap-3 whitespace-nowrap text-xl font-bold text-[var(--color-total-emphasis)]">
          <span>Total</span>
          <span data-testid="quote-total" className="tabular-nums">{formatCents(totalCents)}</span>
        </div>
        <p data-testid="quote-total-in-words" className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
          {formatAmountInWords(totalCents)}
        </p>
      </div>

      <input type="hidden" name="taxEnabled" value={taxEnabled ? "on" : "off"} form={formId} />
      <Switch
        label="Incluir IVA (16%)"
        checked={taxEnabled}
        onCheckedChange={(checked) => onTaxEnabledChange(checked === true)}
      />
      <div className="grid gap-2">
        <Label htmlFor="discount">Descuento (opcional)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">$</span>
          <Input
            id="discount"
            name="discount"
            form={formId}
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
      </div>

      {checklist ? (
        <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3">
          <p className="text-sm font-semibold text-[var(--color-text-main)]">Antes de crear</p>
          <ul className="grid gap-1.5">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-[var(--color-text-main)]">
                <span aria-hidden="true" className={item.done ? "text-[var(--color-status-success-fg)]" : "text-[var(--color-text-muted)]"}>
                  {item.done ? "✓" : "○"}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="[&>button]:w-full">{primaryAction}</div>
    </div>
  );
}
