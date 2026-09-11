import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuoteDocumentView } from "./quote-document-view";
import type { PaymentSettingsData } from "@/features/payment-settings/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/cotizacion/token-123",
}));

const mockPaymentSettings: PaymentSettingsData = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
  address: "Batalla de Casa Blanca 1719B, CDMX",
  mapsUrl: "https://maps.app.goo.gl/example",
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
  hours: {
    weekdays: "Lunes a viernes de 9:00 a 18:00",
    saturday: "Sábados de 9:00 a 15:00",
  },
  services: ["Muelles"],
  products: ["Bujes"],
  bankAccounts: [],
};

const baseQuote = {
  id: "quote-1",
  submissionKey: null,
  submissionHash: null,
  customerId: "cust-1",
  vehicleId: "veh-1",
  customerContactId: null,
  customerFiscalProfileId: null,
  number: "0926-001",
  operationalDate: new Date("2026-09-09T12:00:00Z"),
  title: "Alineación y muelles",
  status: "DRAFT" as const,
  customer: {
    id: "cust-1",
    name: "Enrique Muñoz",
    commercialName: null,
    legalName: null,
    email: null,
    phone: null,
    address: null,
    status: "ACTIVE" as const,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  vehicle: {
    id: "veh-1",
    customerId: "cust-1",
    brand: "Kenworth",
    model: "T680",
    year: 2020,
    color: null,
    plate: "55-AA-1B",
    economicNumber: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  items: [
    {
      id: "item-1",
      quoteId: "quote-1",
      sectionId: null,
      type: "LABOR" as const,
      description: "Bajar dos muelles",
      quantity: 2,
      unitPriceCents: BigInt(60000),
      totalCents: 120000,
      includeInPayroll: false,
      customRatePercent: null,
      customPayrollBaseCents: null,
      sortOrder: 0,
    },
  ],
  sections: [],
  workOrder: null,
  folio: null,
  issuedAt: null,
  administrative: false,
  description: null,
  discountCents: BigInt(0),
  subtotalCents: BigInt(120000),
  taxCents: BigInt(19200),
  taxEnabled: true,
  totalCents: BigInt(139200),
  validUntil: new Date("2026-09-16T12:00:00Z"),
  paymentDueDate: null,
  isLocked: false,
  lockedAt: null,
  lockedById: null,
  lockedReason: null,
  approvedAt: null,
  deletedAt: null,
  customerSnapshot: null,
  contactSnapshot: null,
  vehicleSnapshot: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("QuoteDocumentView", () => {
  it("renders public quote with token, customer and document number", () => {
    render(
      <QuoteDocumentView
        quote={baseQuote}
        paymentSettings={mockPaymentSettings}
        token="token-abc"
      />
    );

    expect(screen.getByText("SEBASAM")).toBeInTheDocument();
    expect(screen.getAllByText("0926-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enrique Muñoz").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bajar dos muelles").length).toBeGreaterThan(0);
  });

  it("renders in print mode with controls", () => {
    render(
      <QuoteDocumentView
        quote={baseQuote}
        paymentSettings={mockPaymentSettings}
        isPrint={true}
        controls={<div data-testid="print-controls">Boton Volver</div>}
      />
    );

    expect(screen.getByTestId("print-controls")).toBeInTheDocument();
    expect(screen.getByText("Bajar dos muelles")).toBeInTheDocument();
  });

  it("renders as Nota with vehicle description override for special orders", () => {
    render(
      <QuoteDocumentView
        quote={baseQuote}
        paymentSettings={mockPaymentSettings}
        documentType="Nota"
        workOrderStatus="COMPLETED"
        vehicleDescriptionOverride="Taller"
        isPrint={true}
      />
    );

    expect(screen.getAllByText("Nota").length).toBeGreaterThan(0);
    expect(screen.getByText("Taller")).toBeInTheDocument();
  });

  it("renders C folio when quote has a daily folio", () => {
    render(
      <QuoteDocumentView
        quote={{ ...baseQuote, folio: "C-090926-01" }}
        paymentSettings={mockPaymentSettings}
        token="token-abc"
      />
    );

    expect(screen.getByText("C-090926-01")).toBeInTheDocument();
  });

  it("renders N folio when completed note has an N folio", () => {
    render(
      <QuoteDocumentView
        quote={{
          ...baseQuote,
          folio: "C-090926-01",
          workOrder: { status: "COMPLETED", folio: "N-090926-05" },
        }}
        paymentSettings={mockPaymentSettings}
        documentType="Nota"
        workOrderStatus="COMPLETED"
      />
    );

    expect(screen.getByText("N-090926-05")).toBeInTheDocument();
  });
});

