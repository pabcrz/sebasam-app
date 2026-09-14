import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCompletedWorkOrderById } from "@/features/work-orders/queries";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import { QuoteDocumentView } from "@/features/public-quotes/components/quote-document-view";
import { formatDocumentPdfFilename } from "@/features/quotes/lib/pdf-filename";
import { resolveDocumentFolio } from "@/features/quotes/lib/document-resolver";
import { PrintControls } from "@/features/quotes/components/print-controls";
import {
  resolveCustomerDisplayIdentity,
  resolveOptionalCustomerName,
} from "@/features/quotes/lib/quote-snapshots";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PrintPageProps): Promise<Metadata> {
  const { id } = await params;
  const workOrder = await getCompletedWorkOrderById(id);

  if (!workOrder) {
    return {
      title: { absolute: "Nota" },
    };
  }

  const { quote } = workOrder;
  const identity = resolveCustomerDisplayIdentity(quote);
  const customerName = resolveOptionalCustomerName(quote);
  const vehicle = workOrder.isSpecial ? "Taller" : quote.vehicle ?? quote.vehicleSnapshot;
  const folio = resolveDocumentFolio(workOrder);
  const title = formatDocumentPdfFilename({
    customerName,
    driverName: identity.operatorName,
    vehicle,
    operationalDate: quote.operationalDate ?? workOrder.completedAt,
    folio,
  });

  return {
    title: { absolute: title },
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

  return (
    <QuoteDocumentView
      quote={{
        ...workOrder.quote,
        workOrder: {
          status: workOrder.status,
          folio: workOrder.folio,
        },
      }}
      workOrderStatus={workOrder.status}
      paymentSettings={paymentSettings}
      documentType="Nota"
      vehicleDescriptionOverride={workOrder.isSpecial ? "Taller" : undefined}
      isPrint={true}
      controls={<Suspense fallback={null}><PrintControls backLabel="Volver a notas" /></Suspense>}
    />
  );
}
