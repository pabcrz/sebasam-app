import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCompletedWorkOrderById } from "@/features/work-orders/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { formatVehicle, formatSnapshotVehicle } from "@/features/quotes/lib/format";
import { PrintControls } from "./print-controls";
import { toPublicBusinessIdentity } from "@/features/public-branding/domain";

export const metadata: Metadata = {
  title: "Nota",
};

interface PrintPageProps {
  params: Promise<{ id: string }>;
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
    <div className="min-h-screen bg-[var(--background)] print:min-h-0">
      <PrintControls />
      <PublicQuoteShell
         business={toPublicBusinessIdentity(paymentSettings)}
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
