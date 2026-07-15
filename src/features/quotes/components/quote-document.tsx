import { useId } from "react";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import type { QuoteDocumentViewModel } from "@/features/quotes/lib/quote-document";
import { quoteConceptTypeLabels } from "@/features/quotes/lib/quote-concepts";

export function QuoteDocument({ document }: { document: QuoteDocumentViewModel }) {
  const titleId = useId();
  const conceptsHeadingId = useId();
  const conditionsHeadingId = useId();
  const unit = [document.unit.brand, document.unit.model, document.unit.year, document.unit.plate]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      aria-labelledby={titleId}
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-main)]"
    >
      <header className="grid gap-5 border-b border-[var(--color-border-light)] p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-7">
        <div>
          <p className="text-xl font-bold tracking-tight">{document.business.name}</p>
          {document.business.legalName ? <p className="text-sm text-[var(--color-text-muted)]">{document.business.legalName}</p> : null}
          {document.business.address ? <address className="mt-2 not-italic text-xs text-[var(--color-text-muted)]">{document.business.address}</address> : null}
          {document.business.phone ? <p className="text-xs text-[var(--color-text-muted)]">{document.business.phone}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Cotización</p>
          <p className="text-lg font-bold">{document.folio}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Emitida el {formatDate(document.issuedAt)}</p>
        </div>
      </header>

      <div className="grid gap-7 p-5 sm:p-7">
        <section aria-labelledby={titleId}>
          <h1 id={titleId} className="text-xl font-semibold">{document.title}</h1>
          {document.description ? <p className="mt-2 text-sm text-[var(--color-text-muted)]">{document.description}</p> : null}
        </section>

        <section aria-label="Cliente y unidad" className="grid gap-4 border-y border-[var(--color-border-light)] py-5 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Cliente</h2>
            <p className="mt-1 font-medium">{document.customer.name}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Unidad</h2>
            <p className="mt-1 font-medium">{unit || "Sin unidad"}</p>
          </div>
        </section>

        <section aria-labelledby={conceptsHeadingId}>
          <h2 id={conceptsHeadingId} className="text-sm font-semibold uppercase tracking-wide">Conceptos</h2>
          <div className="mt-3 overflow-x-auto">
            <table aria-label="Conceptos de la cotización" className="w-full min-w-[34rem] border-collapse text-sm">
              <thead className="border-b border-[var(--color-border-light)] text-left text-xs text-[var(--color-text-muted)]">
                <tr><th className="pb-2 font-medium">Descripción</th><th className="pb-2 text-right font-medium">Precio</th><th className="pb-2 text-right font-medium">Importe</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {document.concepts.map((concept, index) => (
                  <tr key={`${concept.description}-${index}`}>
                    <td className="py-3 pr-4"><span className="font-medium">{concept.description}</span><span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{quoteConceptTypeLabels[concept.type]} · Cant. {concept.quantity}</span></td>
                    <td className="whitespace-nowrap py-3 text-right">{formatCents(concept.unitAmountCents)}</td>
                    <td className="whitespace-nowrap py-3 text-right font-semibold">{formatCents(concept.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="Totales" className="ml-auto grid w-full max-w-xs gap-2 text-sm">
          <p className="flex justify-between text-[var(--color-text-muted)]"><span>Subtotal</span><span>{formatCents(document.subtotalCents)}</span></p>
          <p className="flex justify-between text-[var(--color-text-muted)]"><span>IVA</span><span>{formatCents(document.taxCents)}</span></p>
          <p className="flex justify-between border-t border-[var(--color-border-light)] pt-3 text-lg font-bold"><span>Total</span><span>{formatCents(document.totalCents)}</span></p>
        </section>

        <footer className="grid gap-3 border-t border-[var(--color-border-light)] pt-5 text-sm">
          <p><strong>Vigencia:</strong> hasta el {formatDate(document.validUntil)}</p>
          <section aria-labelledby={conditionsHeadingId}>
            <h2 id={conditionsHeadingId} className="font-semibold">Condiciones</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--color-text-muted)]">{document.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
          </section>
        </footer>
      </div>
    </article>
  );
}
