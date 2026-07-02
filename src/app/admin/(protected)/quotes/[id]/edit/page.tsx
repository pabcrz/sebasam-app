import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { QuoteStatus, type QuoteItem } from "@prisma/client";
import { requireOperationalRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { listCustomers } from "@/features/customers/queries";
import {
  updateDraftQuoteFromForm,
} from "@/features/quotes/actions";
import { EditDraftQuoteForm } from "@/features/quotes/components/edit-draft-quote-form";
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

function toItemFormValues(items: Array<{ type: QuoteItem["type"]; description: string; quantity: unknown; unitPriceCents: unknown }>): QuoteBuilderInitialData["items"] {
  return items.map((item) => ({
    type: item.type,
    description: item.description,
    quantity: String(Number(item.quantity)),
    unitPrice: String(Number(item.unitPriceCents) / 100),
  }));
}

async function loadQuote(quoteId: string) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      customer: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" } },
      workOrder: true,
    },
  });
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  await requireOperationalRole();

  const { id } = await params;
  const [quote, customers] = await Promise.all([loadQuote(id), listCustomers()]);

  if (!quote) notFound();
  if (quote.status !== QuoteStatus.DRAFT || quote.workOrder) {
    redirect("/admin/quotes");
  }

  const saveAction = updateDraftQuoteFromForm.bind(null, id);

  const initialData: QuoteBuilderInitialData = {
    customerId: quote.customerId,
    vehicle: extractVehicleData(quote),
    title: quote.title,
    description: quote.description ?? "",
    administrative: quote.administrative,
    taxEnabled: quote.taxEnabled,
    items: toItemFormValues(quote.items),
  };

  return (
    <EditDraftQuoteForm
      customers={customers}
      saveAction={saveAction}
      initialData={initialData}
      quoteNumber={quote.number}
    />
  );
}
