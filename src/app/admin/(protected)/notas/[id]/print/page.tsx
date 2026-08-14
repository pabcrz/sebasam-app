import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkOrderById } from "@/features/work-orders/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { SharedQuoteView, type SharedQuoteViewQuote } from "@/features/public-quotes/components/shared-quote-view";
import { PrintControls } from "./print-controls";

export const metadata: Metadata = {
  title: "Nota de Remisión",
};

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const [workOrder, paymentSettings] = await Promise.all([
    getWorkOrderById(id),
    getPaymentSettings(),
  ]);

  if (!workOrder) {
    notFound();
  }

  const { quote } = workOrder;

  // Since it's a "nota" (work order), we label it "Nota"
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
    <div className="bg-[var(--background)] min-h-screen">
      <PrintControls workOrderId={workOrder.id} />
      <PublicQuoteShell
        business={paymentSettings}
        documentType={documentType}
        documentNumber={quote.number}
        date={quote.createdAt}
      >
        <SharedQuoteView quote={viewQuote} token="" isNote={true} />
      </PublicQuoteShell>
    </div>
  );
}
