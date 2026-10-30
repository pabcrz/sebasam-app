import type { Metadata } from "next";
import Link from "next/link";
import { listArchivedEligibleQuotes, listRecoverableTrashedQuotes } from "@/features/quotes/queries";
import { restoreTrashedQuoteFromForm } from "@/features/quotes/actions";
import { formatCents, formatDate } from "@/features/quotes/lib/format";

export const metadata: Metadata = { title: "Retención de cotizaciones" };

export default async function QuoteRetentionPage() {
  const [archived, trashed] = await Promise.all([listArchivedEligibleQuotes(), listRecoverableTrashedQuotes()]);
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:px-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">Retención de cotizaciones</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Cotizaciones expiradas elegibles y elementos recuperables de la papelera.</p>
        </div>
        <Link href="/admin/quotes" className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] px-3 py-2 text-sm">Volver a cotizaciones</Link>
      </div>
      <QuoteSection title="Archivadas elegibles" quotes={archived} />
      <QuoteSection title="Papelera recuperable" quotes={trashed} trashed />
    </section>
  );
}

function QuoteSection({ title, quotes, trashed = false }: {
  title: string;
  quotes: Awaited<ReturnType<typeof listArchivedEligibleQuotes>>;
  trashed?: boolean;
}) {
  return (
    <section className="grid min-w-0 gap-3" aria-label={title}>
      <h2 className="text-lg font-semibold text-[var(--color-text-main)]">{title} <span className="text-sm font-normal text-[var(--color-text-muted)]">({quotes.length})</span></h2>
      {quotes.length ? quotes.map((quote) => (
        <article key={quote.id} className="grid min-w-0 gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-[var(--color-text-main)]">{quote.number} · {quote.title}</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{quote.customer?.name ?? "Sin cliente"} · {formatCents(quote.totalCents ?? 0)}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Vigencia comercial: {formatDate(quote.validUntil)}{quote.deletedAt ? ` · En papelera desde ${formatDate(quote.deletedAt)}` : ""}</p>
          </div>
          {trashed ? (
            <form action={restoreTrashedQuoteFromForm} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="reason" value="Restauración administrativa desde papelera" />
              <button type="submit" className="min-h-11 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Restaurar archivada</button>
            </form>
          ) : null}
        </article>
      )) : <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-light)] p-4 text-sm text-[var(--color-text-muted)]">No hay cotizaciones en esta sección.</p>}
    </section>
  );
}
