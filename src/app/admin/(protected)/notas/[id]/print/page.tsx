import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompletedWorkOrderById } from "@/features/work-orders/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { formatDocumentPdfFilename } from "@/features/quotes/lib/pdf-filename";
import { PrintControls } from "@/features/quotes/components/print-controls";
import { Suspense } from "react";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { id } = await params;
  const workOrder = await getCompletedWorkOrderById(id);

  if (!workOrder) {
    return {
      title: "Nota",
    };
  }

  const { quote } = workOrder;
  const vehicle = workOrder.isSpecial ? "Taller" : quote.vehicle ?? quote.vehicleSnapshot;
  const title = formatDocumentPdfFilename({
    customerName: quote.customer?.name,
    vehicle,
    operationalDate: quote.operationalDate ?? workOrder.completedAt,
    fallbackType: "Nota",
  });

  return {
    title,
  };
}

export default async function WorkOrderPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const [workOrder, paymentSettings] = await Promise.all([
    getCompletedWorkOrderById(id),
    getPaymentSettings(),
  ]);

  if (!workOrder) {
    notFound();
  }

  const { quote } = workOrder;

  const documentType = "Nota";

  const viewQuote: SharedQuoteViewQuote = {
    ...quote,
    items: quote.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
    })),
    sections: quote.sections ? quote.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        quantity: item.quantity.toString(),
      })),
    })) : [],
    workOrder: { status: workOrder.status },
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col print:min-h-0">
      <Suspense fallback={null}><PrintControls backLabel="Volver a notas" /></Suspense>
      <PublicQuoteShell
        business={paymentSettings}
        documentType={documentType}
        documentNumber={quote.number}
        date={quote.operationalDate}
        title={quote.title}
        customerName={quote.customer?.name ?? "Sin cliente"}
        vehicleDescription={
          workOrder.isSpecial
            ? "Taller"
            : quote.vehicle
              ? formatVehicle(quote.vehicle)
              : formatSnapshotVehicle(quote.vehicleSnapshot)
        }
      >
        <SharedQuoteView quote={viewQuote} token="" isNote isPrint />
      </PublicQuoteShell>
    </div>
  );
}
