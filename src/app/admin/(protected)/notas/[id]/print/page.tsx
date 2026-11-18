import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCompletedWorkOrderById, getIssuedSaleNoteById } from "@/features/work-orders/queries";
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
  const saleNote = workOrder ? null : await getIssuedSaleNoteById(id);

  if (!workOrder && !saleNote) {
    return {
      title: { absolute: "Nota" },
    };
  }

  const quote = workOrder?.quote ?? saleNote!.quote;
  const identity = resolveCustomerDisplayIdentity(quote);
  const customerName = resolveOptionalCustomerName(quote);
  const vehicle = workOrder?.isSpecial ? "Taller" : quote.vehicle ?? quote.vehicleSnapshot;
  const folio = workOrder ? resolveDocumentFolio(workOrder) : saleNote!.referenceNumber;
  const title = formatDocumentPdfFilename({
    customerName,
    driverName: identity.operatorName,
    vehicle,
    operationalDate: quote.operationalDate ?? workOrder?.completedAt ?? saleNote!.issuedAt,
    folio,
  });

  return {
    title: { absolute: title },
  };
}

export default async function WorkOrderPrintPage({ params }: PrintPageProps) {
  const { id } = await params;
  const [workOrder, saleNote, paymentSettings] = await Promise.all([
    getCompletedWorkOrderById(id),
    getIssuedSaleNoteById(id),
    getPaymentSettings(),
  ]);

  if (!workOrder && !saleNote) {
    notFound();
  }

  return (
    <QuoteDocumentView
      quote={{
        ...(workOrder?.quote ?? saleNote!.quote),
        ...(workOrder
          ? { workOrder: { status: workOrder.status, folio: workOrder.folio, paymentDueDate: workOrder.paymentDueDate } }
          : { payableNote: { kind: saleNote!.kind, status: saleNote!.status, paymentDueDate: saleNote!.paymentDueDate } }),
      }}
      workOrderStatus={workOrder?.status}
      paymentSettings={paymentSettings}
      documentType="Nota"
      vehicleDescriptionOverride={workOrder?.isSpecial ? "Taller" : undefined}
      isPrint={true}
      controls={<Suspense fallback={null}><PrintControls backLabel="Volver a notas" /></Suspense>}
    />
  );
}
