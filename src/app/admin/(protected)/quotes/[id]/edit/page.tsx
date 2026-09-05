import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listCustomers } from "@/features/customers/queries";
import { searchCustomersForQuote } from "@/features/customers/actions";
import { updateDraftQuoteFromForm } from "@/features/quotes/actions";
import { EditDraftQuoteForm } from "@/features/quotes/components/edit-draft-quote-form";
import { isQuoteEditable } from "@/features/quotes/lib/editability";
import { mapPersistedQuoteToBuilderInitialData } from "@/features/quotes/components/quote-builder-mapper";

export const metadata: Metadata = {
  title: "Editar cotización",
};

type EditQuotePageProps = {
  params: Promise<{ id: string }>;
};

async function loadQuote(quoteId: string) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
      workOrder: true,
    },
  });
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  await requireOperationalRole();

  const { id } = await params;
  const [quote, customers] = await Promise.all([loadQuote(id), listCustomers()]);

  if (!quote) notFound();
  if (!isQuoteEditable(quote)) {
    redirect("/admin/quotes");
  }

  const saveAction = updateDraftQuoteFromForm.bind(null, id);

  const initialData = mapPersistedQuoteToBuilderInitialData(quote);

  const customerOptions = quote.customer && customers.some((customer) => customer.id === quote.customerId)
    ? customers
    : quote.customer ? [{ id: quote.customer.id, name: quote.customer.name }, ...customers] : customers;

  return (
    <EditDraftQuoteForm
      customers={customerOptions}
      saveAction={saveAction}
      initialData={initialData}
      quoteId={quote.id}
      quoteNumber={quote.number}
      searchCustomersAction={searchCustomersForQuote}
    />
  );
}
