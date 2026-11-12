import * as React from "react";
import { Badge } from "@/components/ui";
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

export interface DocumentPreviewProps {
  typeLabel: string;
  statusLabel?: string | null;
  administrative?: boolean;
  customer: { name: string; legalName?: string | null };
  contactLine?: string | null;
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
  /** Lines that start with "-" become a bullet list; other lines stay as text. */
  notes?: string | null;
  validityText?: string | null;
  dueDateText?: string | null;
  paymentMethods?: string[];
  /** Slot for the payment balance badge, provided by the host. */
  balance?: React.ReactNode;
}

type NotesBlock = { kind: "text"; text: string } | { kind: "list"; items: string[] };

function groupNotes(notes: string): NotesBlock[] {
  const blocks: NotesBlock[] = [];
  for (const rawLine of notes.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("-")) {
      const item = line.replace(/^-+\s*/, "");
      if (!item) continue;
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") {
        last.items.push(item);
      } else {
        blocks.push({ kind: "list", items: [item] });
      }
    } else {
      blocks.push({ kind: "text", text: line });
    }
  }
  return blocks;
}

/**
 * Read-only document shared by the in-app previews (quote, work order, note and
 * the last step of the quote builder). It has no workshop header and no scroll
 * of its own: the host's body scrolls.
 */
export function DocumentPreview({
  typeLabel,
  statusLabel,
  administrative = false,
  customer,
  contactLine,
  unitLine,
  service,
  sections,
  showSectionHeaders,
  totals,
  notes,
  validityText,
  dueDateText,
  paymentMethods = DEFAULT_PAYMENT_METHODS,
  balance,
}: DocumentPreviewProps) {
  const noteBlocks = notes ? groupNotes(notes) : [];
  const discountCents = totals.discountCents ?? 0;

  return (
    <div data-testid="document-preview" className="grid gap-4 bg-[var(--color-surface)] text-[var(--color-text-main)]">
      <div data-testid="document-preview-status" className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
        {statusLabel ? <Badge variant="default">{statusLabel}</Badge> : null}
        <span>{typeLabel}</span>
        {administrative ? <Badge variant="info">{typeLabel} administrativa</Badge> : null}
      </div>

      <section aria-label="Cliente y unidad" className="grid gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3 sm:grid-cols-2">
        <div className="grid gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Cliente</p>
          <p className="text-sm font-semibold">{customer.name || "Sin cliente"}</p>
          {customer.legalName && customer.legalName !== customer.name ? (
            <p className="text-xs text-[var(--color-text-muted)]">Razón social: {customer.legalName}</p>
          ) : null}
          {contactLine ? (
            <p className="text-xs text-[var(--color-text-muted)]" data-testid="preview-contact-info">{contactLine}</p>
          ) : null}
        </div>
        <div className="grid content-start gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Unidad</p>
          <p className="text-sm font-semibold">{unitLine || "Sin vehículo"}</p>
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
          sections.map((section) => (
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
                    <span className="whitespace-nowrap text-sm font-bold tabular-nums">{formatCents(row.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-label="Totales" data-testid="quote-totals-block" className="grid gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3">
        <p data-testid="quote-total-in-words" className="text-[11px] uppercase leading-snug tracking-wide text-[var(--color-text-muted)]">
          {totals.totalCents === null ? "Pendiente" : formatAmountInWords(totals.totalCents)}
        </p>
        {totals.partialNotice ? (
          <p className="text-[11px] italic text-[var(--color-text-muted)]">* {totals.partialNotice}</p>
        ) : null}
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
        {balance}
      </section>

      {noteBlocks.length > 0 ? (
        <section aria-label="Notas" data-testid="document-preview-notes" className="grid gap-1.5 text-sm text-[var(--color-text-muted)]">
          <p className="text-[10px] font-bold uppercase tracking-widest">Notas</p>
          {noteBlocks.map((block, index) =>
            block.kind === "list" ? (
              <ul key={index} className="grid list-disc gap-1 pl-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={index} className="whitespace-pre-wrap">{block.text}</p>
            ),
          )}
        </section>
      ) : null}

      {paymentMethods.length > 0 ? (
        <section aria-label="Formas de pago" data-testid="document-preview-payment-methods" className="grid gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Formas de pago</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {paymentMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {validityText ? (
        <p data-testid="quote-validity" className="text-[11px] text-[var(--color-text-muted)]">{validityText}</p>
      ) : null}
      {dueDateText ? (
        <p data-testid="note-due-date" className="text-[11px] font-medium text-[var(--color-text-muted)]">{dueDateText}</p>
      ) : null}
    </div>
  );
}
