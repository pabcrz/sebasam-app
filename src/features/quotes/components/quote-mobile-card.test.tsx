import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteListCard } from "./quote-mobile-card";
import type { listQuotes } from "@/features/quotes/queries";
import type { PaymentRequest } from "@prisma/client";

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
    title: "Servicio general",
    description: null,
    vehicleSnapshot: null,
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    validUntil: new Date("2026-12-31"),

    approvedAt: null,
    administrative: false,
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-01"),
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
    vehicle: null,
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

function renderCard(quote: QuoteListItem) {
  return render(
    <QuoteListCard
      quote={quote}
      quoteStatusLabels={quoteStatusLabels}
      quoteStatusBadgeVariant={quoteStatusBadgeVariant}
      approveAction={vi.fn()}
      cancelAction={vi.fn()}
      shareAction={vi.fn()}
      authorizeAction={vi.fn(() => Promise.resolve({ success: true }))}
      paymentRequestAction={vi.fn(() => Promise.resolve({ id: "pr-1", token: "token-1" } as PaymentRequest))}
      paymentRequestBankAccounts={[{
        accountHolder: "Federico Cruz",
        bankName: "Santander",
        accountNumber: "123456",
        clabe: "4444 4444 4444 4444",
      }]}
      cashPaymentAction={vi.fn(() => Promise.resolve({
        payment: { amountCents: 1000 },
        paidCents: 1000,
        remainingCents: 10600,
      }))}
      duplicateAction={vi.fn()}
      deleteAction={vi.fn()}
      archiveAction={vi.fn()}
      restoreAction={vi.fn()}
      customers={[{ id: "cust-1", name: "Constructora del Norte" }]}
      saveAction={vi.fn()}
      searchCustomersAction={vi.fn()}
    />,
  );
}

describe("QuoteListCard", () => {
  it("opens the preview dialog when the card is clicked", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    await user.click(screen.getByLabelText(/abrir vista previa de c-001/i));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
    expect(screen.getByText(/cambio de aceite/i)).toBeInTheDocument();
  });

  it("opens the preview dialog from the keyboard", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    screen.getByRole("button", { name: /abrir vista previa de c-001/i }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
  });

  it("renders direct action buttons (Editar, Duplicar, Compartir, Autorizar)", () => {
    renderCard(createMockQuote());

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /autorizar cotización c-001/i })).toBeInTheDocument();
  });

  it("renders authorize button for sent quotes", () => {
    renderCard(createMockQuote({ status: "SENT" }));

    expect(screen.getByRole("button", { name: /autorizar cotización c-001/i })).toBeInTheDocument();
  });

  it("does not render cancel action for cancelled quotes", () => {
    renderCard(createMockQuote({ status: "CANCELLED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /autorizar cotización/i })).not.toBeInTheDocument();
  });

  it("renders the restore control for archived quotes", () => {
    renderCard(createMockQuote({ status: "ARCHIVED" }));

    expect(screen.getByRole("button", { name: /restaurar cotización c-001/i })).toBeInTheDocument();
  });
});
