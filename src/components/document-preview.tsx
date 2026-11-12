import * as React from "react";
import { Badge, Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { formatAmountInWords } from "@/features/quotes/lib/amount-in-words";

export const DEFAULT_PAYMENT_METHODS = ["Efectivo", "Transferencia", "Tarjeta de débito y crédito"];

export interface DocumentPreviewRow {
  id: string;
  quantityLabel: string;
  description: string;
  /** Shown under the description when the quantity is greater than one. */
  unitDetailLabel: string | null;
  lineTotalCents: number | null;
}

export interface DocumentPreviewSection {
  id: string;
  name: string;
  subtotalCents: number;
  badge?: string | null;
  /** Sections that are not part of the current total (partial authorization). */
  muted?: boolean;
  rows: DocumentPreviewRow[];
}

export interface DocumentPreviewStepShortcut {
  /** Step name shown after the ✎ mark, for example "Cliente". */
  label: string;
  onSelect: () => void;
}

export interface DocumentPreviewProps {
  typeLabel: string;
  statusLabel?: string | null;
  administrative?: boolean;
  customer: { name: string; phone?: string | null };
  /** Driver name, shown as "Chofer: X" under the unit. Only when the data has one. */
  driverName?: string | null;
  unitLine?: string | null;
  service?: string | null;
  sections: DocumentPreviewSection[];
  /** Section header strips and subtotals appear when there is more than one section or an authorization badge. */
  showSectionHeaders: boolean;
  totals: {
    subtotalCents: number | null;
    discountCents?: number;
    taxCents: number | null;
    totalCents: number | null;
    partialNotice?: string | null;
  };
  /** Each non-empty line is one item of the list; a leading "-" is only a marker and is dropped. */
  notes?: string | null;
  /** "Cotizada el …" when the creation date exists. */
  issuedText?: string | null;
  /** "Vigente hasta …" when the validity date exists. */
  validityText?: string | null;
  dueDateText?: string | null;
  paymentMethods?: string[];
  /** Slot for the payment balance badge, provided by the host. */
  balance?: React.ReactNode;
  /** Jump-back chips above the card. Only the builder's preview step supplies them. */
  stepShortcuts?: DocumentPreviewStepShortcut[];
}

function noteItemsFrom(notes: string): string[] {
  return notes
    .split("\n")
    .map((line) => line.trim().replace(/^-+\s*/, ""))
    .filter(Boolean);
}

/**
 * Read-only document shared by the in-app previews (quote, work order, note and
 * the last step of the quote builder). It has no workshop header and no scroll
 * of its own: the host's body scrolls. The document is a white card that sits
 * on the host's `--background`.
 */
export function DocumentPreview({
  typeLabel,
  statusLabel,
  administrative = false,
  customer,
  driverName,
  unitLine,
  service,
  sections,
  showSectionHeaders,
  totals,
  notes,
  issuedText,
  validityText,
  dueDateText,
  paymentMethods = DEFAULT_PAYMENT_METHODS,
  balance,
  stepShortcuts,
}: DocumentPreviewProps) {
  const noteItems = notes ? noteItemsFrom(notes) : [];
  const discountCents = totals.discountCents ?? 0;
  const dateParts = [issuedText, validityText, dueDateText].filter(Boolean);

  return (
    <div data-testid="document-preview" className="grid gap-3 text-[var(--color-text-main)]">
      {stepShortcuts && stepShortcuts.length > 0 ? (
        <div data-testid="document-preview-step-shortcuts" className="flex flex-wrap gap-2">
          {stepShortcuts.map((shortcut) => (
            <Button key={shortcut.label} type="button" variant="outline" size="sm" onClick={shortcut.onSelect}>
              {`✎ ${shortcut.label}`}
            </Button>
          ))}
        </div>
      ) : null}

      <div
        data-testid="document-preview-card"
        className="grid gap-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
      >
        <div data-testid="document-preview-status" className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {statusLabel ? <Badge variant="default">{statusLabel}</Badge> : null}
          <span>{typeLabel}</span>
          {administrative ? <Badge variant="info">{typeLabel} administrativa</Badge> : null}
        </div>

        <section aria-label="Cliente y unidad" className="grid grid-cols-2 gap-3">
          <div className="grid content-start gap-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Cliente</p>
            <p className="text-sm font-semibold">{customer.name || "Sin cliente"}</p>
            {customer.phone ? (
              <p className="text-xs text-[var(--color-text-muted)]" data-testid="preview-customer-phone">{customer.phone}</p>
            ) : null}
          </div>
          <div className="grid content-start gap-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Unidad</p>
            <p className="text-sm font-semibold">{unitLine || "Sin vehículo"}</p>
            {driverName ? (
              <p className="text-xs text-[var(--color-text-muted)]" data-testid="preview-driver">{`Chofer: ${driverName}`}</p>
            ) : null}
          </div>
        </section>

        {service ? (
          <div data-testid="document-preview-service" className="grid gap-0.5 border-y border-[var(--color-border-light)] py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Servicio</p>
            <h3 className="text-sm font-semibold">{service}</h3>
          </div>
        ) : null}

        <section aria-label="Conceptos" className="grid gap-3">
          {sections.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
          ) : (
            <>
              <div
                data-testid="document-preview-table-head"
                className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]"
              >
                <span>CANT.</span>
                <span>CONCEPTO</span>
                <span className="text-right">IMPORTE</span>
              </div>
              {sections.map((section) => (
                <div key={section.id} className={`grid gap-1 ${section.muted ? "opacity-40" : ""}`}>
                  {showSectionHeaders ? (
                    <div
                      data-testid="document-preview-section-header"
                      className="flex items-center justify-between gap-2 rounded-[var(--radius-xs)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{section.name}</span>
                        {section.badge ? (
                          <span className="rounded-full border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[var(--color-status-success-fg)]">
                            {section.badge}
                          </span>
                        ) : null}
                      </span>
                      <span data-testid="document-preview-section-subtotal" className="tabular-nums normal-case tracking-normal">
                        {formatCents(section.subtotalCents)}
                      </span>
                    </div>
                  ) : null}
                  <ul className="grid">
                    {section.rows.map((row) => (
                      <li
                        key={row.id}
                        className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-2 border-b border-[var(--color-border-light)]/60 px-3 py-2 last:border-b-0"
                      >
                        <span className="tabular-nums text-sm text-[var(--color-text-muted)]">{row.quantityLabel}</span>
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium leading-snug">{row.description}</span>
                          {row.unitDetailLabel ? (
                            <span className="block text-xs text-[var(--color-text-muted)]">{row.unitDetailLabel}</span>
                          ) : null}
                        </span>
                        <span className="whitespace-nowrap text-right text-sm font-bold tabular-nums">{formatCents(row.lineTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </section>

        <section aria-label="Totales" data-testid="quote-totals-block" className="grid gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3">
          <dl className="grid gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-text-muted)]">Subtotal</dt>
              <dd data-testid="quote-subtotal" className="tabular-nums">{formatCents(totals.subtotalCents)}</dd>
            </div>
            {discountCents > 0 ? (
              <div className="flex items-center justify-between text-[var(--color-status-success-fg)]">
                <dt>Descuento</dt>
                <dd data-testid="quote-discount" className="tabular-nums">-{formatCents(discountCents)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-b border-[var(--color-border-light)] pb-2">
              <dt className="text-[var(--color-text-muted)]">IVA (16%)</dt>
              <dd data-testid="quote-tax" className="tabular-nums">{formatCents(totals.taxCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between pt-1 text-xl font-bold text-[var(--color-total-emphasis)]">
              <dt>Total</dt>
              <dd data-testid="quote-total" className="tabular-nums">{formatCents(totals.totalCents)}</dd>
            </div>
          </dl>
          <p data-testid="quote-total-in-words" className="text-[11px] uppercase leading-snug tracking-wide text-[var(--color-text-muted)]">
            {totals.totalCents === null ? "Pendiente" : formatAmountInWords(totals.totalCents)}
          </p>
          {totals.partialNotice ? (
            <p className="text-[11px] italic text-[var(--color-text-muted)]">* {totals.partialNotice}</p>
          ) : null}
          {balance}
        </section>

        {noteItems.length > 0 ? (
          <section aria-label="Notas" data-testid="document-preview-notes" className="grid gap-1.5 border-t border-[var(--color-border-light)] pt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Notas</p>
            <ul className="grid list-disc gap-1 pl-5 text-sm text-[var(--color-text-muted)]">
              {noteItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {paymentMethods.length > 0 ? (
          <section aria-label="Formas de pago" data-testid="document-preview-payment-methods" className="grid gap-1.5 border-t border-[var(--color-border-light)] pt-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Formas de pago</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {paymentMethods.map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {dateParts.length > 0 ? (
          <p data-testid="document-preview-dates" className="text-[11px] text-[var(--color-text-muted)]">
            {dateParts.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
