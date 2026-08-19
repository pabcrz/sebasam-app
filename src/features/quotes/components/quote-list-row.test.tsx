import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteListRow } from "./quote-list-row";
import type { listQuotes } from "@/features/quotes/queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));


type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

const quoteStatusLabels = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  ARCHIVED: "Archivada",
} as const;

const quoteStatusBadgeVariant = {
  DRAFT: "default" as const,
  SENT: "info" as const,
  APPROVED: "success" as const,
  REJECTED: "danger" as const,
  CANCELLED: "warning" as const,
  ARCHIVED: "default" as const,
};

function createMockQuote(overrides: Partial<QuoteListItem> = {}): QuoteListItem {
  return {
    id: "quote-1",
    submissionKey: "key-1",
    submissionHash: "hash-1",
    customerId: "cust-1",
    vehicleId: "veh-1",
    number: "C-001",
    status: "DRAFT",
    title: "Mantenimiento preventivo",
    description: null,
    vehicleSnapshot: null,
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    validUntil: new Date("2026-12-31"),

    approvedAt: null,
    administrative: false, deletedAt: null,
    operationalDate: new Date("2026-06-15T00:00:00.000Z"),
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
    sections: [],
    customer: {
      id: "cust-1",
      name: "Constructora del Norte",
      email: "contacto@constructora.com",
      phone: "555-0192",
      address: null,
      status: "ACTIVE",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      fiscalProfiles: [],
    },
    vehicle: {
      id: "veh-1",
      customerId: "cust-1",
      brand: "Ford",
      model: "F-150",
      year: 2020,
      color: "Blanco",
      plate: "ABC-123",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    items: [
      {
        id: "item-1",
        quoteId: "quote-1",
        sectionId: null,
        type: "SERVICE",
        description: "Cambio de aceite",
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
        sortOrder: 0,
      },
    ],
    workOrder: null,
    paymentRequests: [],
    sharedQuotes: [],
    activeSharedQuote: null,

    paidCents: 0,
    remainingCents: 11600,



    ...overrides,
  };
}

function renderRow(quote: QuoteListItem) {
  return render(
    <table>
      <tbody>
        <QuoteListRow
          quote={quote}
          cashPaymentAction={vi.fn()}
          archiveAction={vi.fn()}
          restoreAction={vi.fn()}
          quoteStatusLabels={quoteStatusLabels}
          quoteStatusBadgeVariant={quoteStatusBadgeVariant}
          approveAction={vi.fn()}
          cancelAction={vi.fn()}
          shareAction={vi.fn()}
          authorizeAction={vi.fn().mockResolvedValue({ success: true })}
          correctDecisionAction={vi.fn().mockResolvedValue({ success: true })}
          paymentRequestAction={vi.fn()}
          paymentRequestBankAccounts={[
            { accountHolder: "SEBASAM", bankName: "Santander", accountNumber: "1234", clabe: "5678" },
          ]}

          duplicateAction={vi.fn()}
          deleteAction={vi.fn()}
          customers={[{ id: "cust-1", name: "Constructora del Norte" }]}
          saveAction={vi.fn()}
          searchCustomersAction={vi.fn()}
        />
      </tbody>
    </table>,
  );
}



describe("QuoteListRow", () => {
  it("renders quote details correctly", () => {
    renderRow(createMockQuote());

    expect(screen.getByText("C-001")).toBeInTheDocument();
    expect(screen.getByText("Constructora del Norte")).toBeInTheDocument();
    expect(screen.getByText("Ford F-150 - ABC-123")).toBeInTheDocument();

    expect(screen.getByText("Mantenimiento preventivo")).toBeInTheDocument();
  });

  it("renders cancellation but not commercial authorization for draft quotes", () => {
    renderRow(createMockQuote());

    expect(screen.queryByRole("button", { name: /autorizar cotización c-001/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("renders status badge", () => {
    renderRow(createMockQuote({ status: "APPROVED" }));

    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it("renders work order operations trigger for approved quotes", () => {
    renderRow(createMockQuote({ status: "APPROVED" }));

    expect(screen.getByRole("button", { name: /gestionar trabajo/i })).toBeInTheDocument();
  });

  it("does not render cancel action for cancelled quotes", () => {
    renderRow(createMockQuote({ status: "CANCELLED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /autorizar cotización/i })).not.toBeInTheDocument();
  });

  it("renders direct action buttons (Editar, Duplicar, Compartir)", () => {
    renderRow(createMockQuote());

    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preparar y compartir cotización c-001/i })).toBeInTheDocument();
  });
});
