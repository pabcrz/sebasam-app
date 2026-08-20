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
    administrative: false, deletedAt: null,
    operationalDate: new Date("2026-06-15T00:00:00.000Z"),
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
      correctDecisionAction={vi.fn(() => Promise.resolve({ success: true }))}
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

  it("shows the operational quote date instead of the audit creation timestamp", () => {
    renderCard(createMockQuote({
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      operationalDate: new Date("2026-06-15T00:00:00.000Z"),
    }));

    expect(screen.getByText(/fecha de cotización: 15 de junio de 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/creada el/i)).not.toBeInTheDocument();
  });

  it("opens the preview dialog from the keyboard", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    screen.getByRole("button", { name: /abrir vista previa de c-001/i }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
  });

  it("retains the padded, clickable quote-card reference surface", () => {
    renderCard(createMockQuote());

    const preview = screen.getByRole("button", { name: /abrir vista previa de c-001/i });
    expect(preview.parentElement).toHaveClass("p-4");
    expect(preview).toHaveClass("block", "w-full", "rounded-[var(--radius-sm)]", "focus-visible:ring-offset-2");
  });

  it("keeps every direct draft action icon-only on mobile without overflow and restores labels on desktop", () => {
    renderCard(createMockQuote({ activeSharedQuote: { token: "share-token" } as QuoteListItem["activeSharedQuote"] }));

    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    const duplicate = screen.getByRole("button", { name: "Duplicar cotización" });
    const remove = screen.getByRole("button", { name: "Eliminar cotización C-001" });
    const publish = screen.getByRole("button", { name: "Preparar y compartir cotización C-001" });
    const cancel = screen.getByRole("button", { name: "Cancelar cotización C-001" });
    const archive = screen.getByRole("button", { name: "Archivar cotización C-001" });
    const actions = [edit, duplicate, remove, publish, cancel, archive];
    expect(screen.queryByRole("button", { name: "Compartir cotización C-001" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Autorizar cotización C-001" })).not.toBeInTheDocument();
    const actionRow = edit.parentElement?.parentElement;

    expect(actionRow).toHaveClass(
      "flex",
      "w-full",
      "flex-wrap",
      "items-center",
      "gap-3",
      "[&_button]:h-10",
      "[&_button]:w-10",
      "sm:gap-2",
      "sm:[&_button]:h-9",
      "sm:[&_button]:w-auto",
    );
    actions.forEach((action) => {
      expect(action.parentElement?.parentElement).toBe(actionRow);
      expect(action.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    });
    actions.forEach((action) => expect(action.querySelector("span")).toHaveClass("sr-only", "sm:not-sr-only"));
    expect(edit).toHaveAttribute("title", "Editar cotización C-001");
    expect(duplicate).toHaveAttribute("title", "Duplicar cotización");
    expect(remove).toHaveAttribute("title", "Eliminar cotización C-001");
    expect(publish).toHaveAttribute("title", "Preparar y compartir cotización C-001");
    expect(cancel).toHaveAttribute("title", "Cancelar cotización C-001");
    expect(archive).toHaveAttribute("title", "Archivar cotización C-001");
  });

  it("renders a pending-price draft without payment actions", () => {
    const quote = createMockQuote();

    renderCard(createMockQuote({
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
      items: quote.items.map((item) => ({ ...item, unitPriceCents: null, totalCents: null })),
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar cotización c-001/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /preparar y compartir cotización c-001/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("keeps the work action icon-only on mobile and labeled on desktop", () => {
    renderCard(createMockQuote({ status: "APPROVED" }));

    const work = screen.getByRole("button", { name: "Gestionar trabajo de cotización C-001" });
    expect(work).toHaveClass("h-10", "w-10", "px-0", "sm:h-9", "sm:w-auto", "sm:px-3");
    expect(work.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    expect(work.querySelector("span")).toHaveClass("sr-only", "sm:not-sr-only");
    expect(work).toHaveAttribute("title", "Gestionar trabajo de cotización C-001");
  });

  it("preserves payment actions for approved quotes with work in progress", () => {
    renderCard(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
    }));

    expect(screen.getByRole("button", { name: /link de pago/i })).toBeInTheDocument();
  });

  it("hides payment actions when an approved in-progress quote has incomplete totals", () => {
    renderCard(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gestionar orden de trabajo ot-001/i })).toBeInTheDocument();
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
