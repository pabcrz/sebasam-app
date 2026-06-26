import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { updateDraftQuoteFromForm } from "@/features/quotes/actions";
import { getQuoteById } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { QuoteBuilder } from "@/features/quotes/components/quote-builder";

export const metadata: Metadata = {
  title: "Editar cotización",
};

type EditQuotePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditQuotePage({ params, searchParams }: EditQuotePageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [quote, customers] = await Promise.all([getQuoteById(id), listCustomers()]);

  if (!quote) {
    notFound();
  }

  const isEditable = quote.status === "DRAFT";
  const updateQuote = updateDraftQuoteFromForm.bind(null, quote.id);

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/admin/quotes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Regresar a cotizaciones
        </Link>
      </Button>

      {isEditable ? (
        <QuoteBuilder customers={customers} createAction={updateQuote} mode="edit" quote={quote} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle as="h1">Cotización no editable</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Solo las cotizaciones en borrador pueden editarse. Esta cotización está en estado{" "}
              <strong>{quote.status === "CANCELLED" ? "Cancelada" : quote.status}</strong>.
            </p>
            {query.error === "not-draft" ? (
              <p className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
                La cotización ya no está en borrador y no se puede editar.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
