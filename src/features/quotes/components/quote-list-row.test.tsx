import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import type { PaymentRequest, QuoteStatus } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import { QuoteListRow } from "./quote-list-row";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

function createMockQuote(overrides: Partial<QuoteListItem> = {}): QuoteListItem {
  return {
    id: "quote-1",
    customerId: "cust-1",
    vehicleId: null,
    number: "C-001",
    status: "DRAFT",
    title: "Servicio general",
    description: "Revisión completa",
    vehicleSnapshot: null,
    subtotalCents: 10000,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    validUntil: new Date("2026-12-31T00:00:00.000Z"),
    approvedAt: null,
    administrative: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: "cust-1", name: "Constructora del Norte", fiscalProfiles: [] },
    vehicle: null,
    items: [
      {
        id: "item-1",
        quoteId: "quote-1",
        type: "LABOR",
        description: "Cambio de aceite",
        quantity: 2,
        unitPriceCents: 5000,
        totalCents: 10000,
        sortOrder: 0,
      },
    ],
    workOrder: null,
    paymentRequests: [],
    sharedQuotes: [],
    activeSharedQuote: null,
    ...overrides,
  } as QuoteListItem;
}

function renderRow(quote: QuoteListItem) {
  return render(
    <table>
      <tbody>
        <QuoteListRow
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
          duplicateAction={vi.fn()}
          customers={[{ id: "cust-1", name: "Constructora del Norte" }]}
          saveAction={vi.fn()}
          searchCustomersAction={vi.fn()}
        />
      </tbody>
    </table>,
  );
}

describe("QuoteListRow", () => {
  it("opens the preview dialog when the row is clicked", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote());

    await user.click(screen.getByLabelText(/abrir vista previa de c-001/i));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
  });

  it("does not open the preview dialog when an action button is clicked", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote());

    await user.click(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i }));

    expect(screen.queryByRole("dialog", { name: /vista previa/i })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /aprobar cotización/i })).toBeInTheDocument();
  });

  it("renders approval and cancel actions for draft quotes", () => {
    renderRow(createMockQuote());

    expect(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("renders only the quote status badge", () => {
    renderRow(createMockQuote({ status: "APPROVED", paidCents: 2500, remainingCents: 9100 }));

    expect(screen.queryByTestId("quote-payment-balance-indicator")).not.toBeInTheDocument();
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it("does not render cancel action for approved quotes", () => {
    renderRow(createMockQuote({ status: "APPROVED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link de pago/i })).toBeInTheDocument();
  });

  it("passes quote payment context to the payment link dialog", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote({ status: "APPROVED" }));

    await user.click(screen.getByRole("button", { name: /link de pago/i }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Cotización C-001")).toBeInTheDocument();
    expect(dialog.getByText("Constructora del Norte")).toBeInTheDocument();
    expect(dialog.getByText("Factura requerida")).toBeInTheDocument();
    expect(dialog.getByText("Santander")).toBeInTheDocument();
  });

  it("does not render cancel action for draft quotes with a work order", () => {
    renderRow(createMockQuote({
      workOrder: {
        id: "work-order-1",
        quoteId: "quote-1",
        number: "T-001",
        status: "PLANNED",
        notes: null,
        scheduledFor: null,
        siteAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
  });

  it("does not render actions for cancelled quotes", () => {
    renderRow(createMockQuote({ status: "CANCELLED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aprobar y crear orden de trabajo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
  });

  it("renders an edit link for draft quotes without a work order", () => {
    renderRow(createMockQuote());

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("renders a disabled edit button for draft quotes with a COMPLETED work order", () => {
    renderRow(createMockQuote({
      workOrder: {
        id: "work-order-1",
        quoteId: "quote-1",
        number: "T-001",
        status: "COMPLETED",
        notes: null,
        scheduledFor: null,
        siteAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });

  it("renders an edit link for draft quotes with a PLANNED work order", () => {
    renderRow(createMockQuote({
      workOrder: {
        id: "work-order-1",
        quoteId: "quote-1",
        number: "T-001",
        status: "PLANNED",
        notes: null,
        scheduledFor: null,
        siteAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("renders a disabled edit button for non-editable quotes", () => {
    renderRow(createMockQuote({ status: "CANCELLED" }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });

  it("renders an edit link for APPROVED quotes without a blocked work order", () => {
    renderRow(createMockQuote({ status: "APPROVED" }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("renders an edit link for SENT quotes", () => {
    renderRow(createMockQuote({ status: "SENT" }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("renders a duplicate button for every quote including cancelled ones", () => {
    renderRow(createMockQuote({ status: "CANCELLED" }));

    expect(screen.getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
  });

  it("does not open the preview dialog when the edit link is clicked", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote());

    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.queryByRole("dialog", { name: /vista previa/i })).not.toBeInTheDocument();
  });
});
