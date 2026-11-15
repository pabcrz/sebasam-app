import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotaDetailDialog } from "@/features/work-orders/components/nota-detail-dialog";
import { QuotePreviewDialog, type QuotePreviewSummary } from "./quote-preview-dialog";

const quote = {
  id: "quote-1",
  number: "C-001",
  title: "Servicio general",
  description: "- Cambio de hojas\n- Revisión de bujes",
  administrative: false,
  status: "APPROVED",
  subtotalCents: 10000,
  discountCents: 0,
  taxCents: 1600,
  totalCents: 11600,
  paidCents: 0,
  remainingCents: 11600,
  validUntil: new Date("2026-12-31T00:00:00.000Z"),
  customer: { name: "Constructora del Norte" },
  customerSnapshot: null,
  contactSnapshot: null,
  customerContact: null,
  customerFiscalProfile: null,
  vehicle: null,
  vehicleSnapshot: null,
  workOrder: null,
  items: [
    { sectionId: null, type: "LABOR", description: "Cambio de aceite", quantity: 2, unitPriceCents: 5000 },
  ],
  sections: [],
} as unknown as QuotePreviewSummary;

describe("document preview hosts", () => {
  it("renders the quote preview dialog through the shared DocumentPreview", async () => {
    render(<QuotePreviewDialog quote={quote} open onOpenChange={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("document-preview")).toHaveTextContent("Cambio de aceite");
  });

  it("renders the note detail through the same shared DocumentPreview", () => {
    render(
      <NotaDetailDialog
        workOrderId="wo-1"
        workOrderNumber="OT-001"
        quote={quote as never}
        noteFolio="N-001"
        customerName="Constructora del Norte"
        open
        onOpenChange={() => {}}
        noteReturnTo="/admin/notas"
        customers={[]}
        shareAction={async () => ({ success: true, token: "t" })}
      />,
    );

    expect(screen.getByTestId("nota-detail-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("document-preview")).toHaveTextContent("Cambio de aceite");
    expect(screen.getByTestId("document-preview").querySelectorAll('[data-testid="document-preview-notes"] li')).toHaveLength(2);
  });
});
