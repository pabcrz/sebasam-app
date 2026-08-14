import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { type QuoteItem } from "@prisma/client";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listCustomers } from "@/features/customers/queries";
import { searchCustomersForQuote } from "@/features/customers/actions";
import { updateDraftQuoteFromForm } from "@/features/quotes/actions";
import { EditDraftQuoteForm } from "@/features/quotes/components/edit-draft-quote-form";
import { isQuoteEditable } from "@/features/quotes/lib/editability";
import type { QuoteBuilderInitialData } from "@/features/quotes/components/quote-builder";

export const metadata: Metadata = {
  title: "Editar cotización",
};

type EditQuotePageProps = {
  params: Promise<{ id: string }>;
};

function extractVehicleData(quote: Awaited<ReturnType<typeof loadQuote>>): QuoteBuilderInitialData["vehicle"] {
  if (quote?.vehicle) {
    return {
      plate: quote.vehicle.plate ?? "",
      brand: quote.vehicle.brand ?? "",
      model: quote.vehicle.model ?? "",
      year: quote.vehicle.year != null ? String(quote.vehicle.year) : "",
    };
  }

  if (quote?.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)) {
    const snapshot = quote.vehicleSnapshot as Record<string, unknown>;
    return {
      plate: snapshot.plate != null ? String(snapshot.plate) : "",
      brand: snapshot.brand != null ? String(snapshot.brand) : "",
      model: snapshot.model != null ? String(snapshot.model) : "",
      year: snapshot.year != null ? String(snapshot.year) : "",
    };
  }

  return { plate: "", brand: "", model: "", year: "" };
}

function toItemFormValue(item: {
  type: QuoteItem["type"];
  description: string;
  quantity: unknown;
  unitPriceCents: unknown;
}) {
  return {
    type: item.type,
    description: item.description,
    quantity: String(Number(item.quantity)),
    unitPrice: String(Number(item.unitPriceCents) / 100),
  };
}

async function loadQuote(quoteId: string) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      vehicle: true,
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

  // Map DB sections → QuoteBuilderInitialData sections
  const sections: QuoteBuilderInitialData["sections"] = quote.sections.length > 0
    ? quote.sections.map((section) => ({
        name: section.name,
        items: section.items.map(toItemFormValue),
      }))
    : [{ name: "General", items: [] }];

  const initialData: QuoteBuilderInitialData = {
    customerId: quote.customerId,
    vehicle: extractVehicleData(quote),
    title: quote.title,
    description: quote.description ?? "",
    administrative: quote.administrative,
    taxEnabled: quote.taxEnabled,
    discountCents: quote.discountCents,
    sections,
  };

  const customerOptions = customers.some((customer) => customer.id === quote.customerId)
    ? customers
    : [{ id: quote.customer.id, name: quote.customer.name }, ...customers];

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
