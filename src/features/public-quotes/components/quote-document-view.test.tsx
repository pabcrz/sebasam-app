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
  it.each(["ASSIGNED", "IN_PROGRESS"] as const)("does not turn a service-note label into an issued payment deadline (%s)", (status) => {
    render(<QuoteDocumentView quote={{ ...baseQuote,
      paymentDueDate: new Date("2026-09-30T12:00:00Z"), workOrder: { status },
    }} paymentSettings={mockPaymentSettings} />);
    expect(screen.queryByTestId("note-due-date")).not.toBeInTheDocument();
  });

  it("uses the issued work deadline in the public/print document", () => {
    render(<QuoteDocumentView quote={{ ...baseQuote, paymentDueDate: null,
      workOrder: { status: "COMPLETED", paymentDueDate: new Date("2026-09-30T12:00:00Z") },
    }} paymentSettings={mockPaymentSettings} isPrint />);
    expect(screen.getByTestId("note-due-date")).toHaveTextContent("30 de septiembre");
  });

  it("recognizes an issued sale and its deadline without an OT", () => {
    render(<QuoteDocumentView quote={{ ...baseQuote, paymentDueDate: null,
      payableNote: { kind: "SALE", status: "ISSUED", paymentDueDate: new Date("2026-09-30T12:00:00Z") },
    }} paymentSettings={mockPaymentSettings} />);
    expect(screen.getByTestId("note-due-date")).toHaveTextContent("30 de septiembre");
  });

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

  it("renders legacy fixtures without payment bank accounts", () => {
    const legacyPaymentSettings = { ...mockPaymentSettings, bankAccounts: undefined } as unknown as PaymentSettingsData;

    render(
      <QuoteDocumentView
        quote={baseQuote}
        paymentSettings={legacyPaymentSettings}
        isPrint
      />,
    );

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

  it("renders flat unit metadata in print mode without empty values", () => {
    render(
      <QuoteDocumentView
        quote={{
          ...baseQuote,
          vehicle: { ...baseQuote.vehicle, plate: "55-AA-1B", economicNumber: "ECO-7" },
          contactSnapshot: { id: "contact-1", name: "Luis Pérez", phone: null, role: "DRIVER" },
        }}
        paymentSettings={mockPaymentSettings}
        documentType="Nota"
        workOrderStatus="COMPLETED"
        isPrint
      />,
    );

    expect(screen.getByText("Placas")).toBeInTheDocument();
    expect(screen.getByText("55-AA-1B")).toBeInTheDocument();
    expect(screen.getByText("Eco")).toBeInTheDocument();
    expect(screen.getByText("ECO-7")).toBeInTheDocument();
    expect(screen.getByText("Chofer")).toBeInTheDocument();
    expect(screen.getByText("Luis Pérez")).toBeInTheDocument();
    expect(screen.getByText("Kenworth T680")).toBeInTheDocument();
    expect(screen.queryByText("Operador: Luis Pérez")).not.toBeInTheDocument();
    expect(screen.queryByText(/ECO-7 · 55-AA-1B| - /)).not.toBeInTheDocument();
    expect(screen.getByText("ECO-7").closest("span")).not.toHaveClass("rounded-[6px]", "bg-white/10", "print:bg-gray-50");
  });

  it("renders assigned work as a Nota while preserving the quote folio", () => {
    render(
      <QuoteDocumentView
        quote={{
          ...baseQuote,
          folio: "C-090926-01",
          workOrder: { status: "ASSIGNED", folio: null },
        }}
        paymentSettings={mockPaymentSettings}
      />
    );

    expect(screen.getAllByText("Nota").length).toBeGreaterThan(0);
    expect(screen.getByText("C-090926-01")).toBeInTheDocument();
  });
});
