import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import type { PaymentRequest, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import type { listQuotes } from "@/features/quotes/queries";
import { QuoteMobileCard } from "./quote-mobile-card";

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

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PLANNED: "Planeada",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const workOrderStatusBadgeVariant: Record<WorkOrderStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  PLANNED: "default",
  ASSIGNED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
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
    customer: { id: "cust-1", name: "Constructora del Norte" },
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

function renderCard(quote: QuoteListItem) {
  return render(
    <QuoteMobileCard
      quote={quote}
      quoteStatusLabels={quoteStatusLabels}
      quoteStatusBadgeVariant={quoteStatusBadgeVariant}
      workOrderStatusLabels={workOrderStatusLabels}
      workOrderStatusBadgeVariant={workOrderStatusBadgeVariant}
      approveAction={vi.fn()}
      cancelAction={vi.fn()}
      shareAction={vi.fn()}
      authorizeAction={vi.fn(() => Promise.resolve({ success: true }))}
      paymentRequestAction={vi.fn(() => Promise.resolve({ id: "pr-1", token: "token-1" } as PaymentRequest))}
      duplicateAction={vi.fn()}
    />,
  );
}

describe("QuoteMobileCard", () => {
  it("opens the preview dialog when the card is clicked", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    await user.click(screen.getByLabelText(/abrir vista previa de c-001/i));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Vista previa de C-001")).toBeInTheDocument();
    expect(screen.getByText(/cambio de aceite/i)).toBeInTheDocument();
  });

  it("opens the preview dialog from the keyboard", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    screen.getByRole("button", { name: /abrir vista previa de c-001/i }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Vista previa de C-001")).toBeInTheDocument();
  });

  it("does not render a redundant preview trigger", () => {
    renderCard(createMockQuote());

    expect(screen.queryByRole("button", { name: /ver vista previa/i })).not.toBeInTheDocument();
  });

  it("does not list individual quote items on the card", () => {
    renderCard(createMockQuote());

    expect(screen.queryByText(/cambio de aceite/i)).not.toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("IVA")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$116.00")).toBeInTheDocument();
  });

  it("renders missing vehicle with lower-weight text", () => {
    renderCard(createMockQuote());

    expect(screen.getByText("Sin vehículo")).toBeInTheDocument();
  });

  it("renders the work order as a non-clickable related row", () => {
    renderCard(createMockQuote({
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

    expect(screen.getByText("Orden de trabajo")).toBeInTheDocument();
    expect(screen.getByText("T-001")).toBeInTheDocument();
    expect(screen.getByText("Planeada")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /t-001|orden de trabajo/i })).not.toBeInTheDocument();
  });

  it("promotes the active shared quote link as the first action", () => {
    renderCard(createMockQuote({
      activeSharedQuote: {
        id: "shared-1",
        quoteId: "quote-1",
        token: "token-1",
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        revokedAt: null,
        createdAt: new Date(),
      } as unknown as QuoteListItem["activeSharedQuote"],
    }));

    const actions = screen.getAllByRole("button").filter((button) => button !== screen.getByLabelText(/abrir vista previa/i));

    expect(actions[0]).toHaveAccessibleName(/ver link de cotización c-001/i);
    expect(screen.queryByRole("button", { name: /compartir cotización/i })).not.toBeInTheDocument();
  });

  it("promotes share as the first action when no active shared quote exists", () => {
    renderCard(createMockQuote());

    const actions = screen.getAllByRole("button").filter((button) => button !== screen.getByLabelText(/abrir vista previa/i));

    expect(actions[0]).toHaveAccessibleName(/compartir cotización c-001/i);
  });

  it("does not open the preview dialog when an action button is clicked", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    await user.click(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i }));

    expect(screen.queryByRole("dialog", { name: /vista previa/i })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /aprobar cotización/i })).toBeInTheDocument();
  });

  it("renders approval and cancel actions for draft quotes", () => {
    renderCard(createMockQuote());

    expect(screen.getByRole("button", { name: /aprobar y crear orden de trabajo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("does not render cancel action for approved quotes", () => {
    renderCard(createMockQuote({ status: "APPROVED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /link de pago/i })).toBeInTheDocument();
  });

  it("does not render cancel action for draft quotes with a work order", () => {
    renderCard(createMockQuote({
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

  it("renders authorize button for sent quotes", () => {
    renderCard(createMockQuote({ status: "SENT" }));

    expect(screen.getByRole("button", { name: /autorizar cotización c-001/i })).toBeInTheDocument();
  });

  it("does not render actions for cancelled quotes", () => {
    renderCard(createMockQuote({ status: "CANCELLED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aprobar y crear orden de trabajo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
  });

  it("renders an edit link for draft quotes without a work order", () => {
    renderCard(createMockQuote());

    const editLink = screen.getByRole("link", { name: /editar cotización/i });
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute("href", "/admin/quotes/quote-1/edit");
  });

  it("renders a disabled edit button for draft quotes with a COMPLETED work order", () => {
    renderCard(createMockQuote({
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
    renderCard(createMockQuote({
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

    const editLink = screen.getByRole("link", { name: /editar cotización/i });
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute("href", "/admin/quotes/quote-1/edit");
  });

  it("renders a disabled edit button for non-editable quotes", () => {
    renderCard(createMockQuote({ status: "CANCELLED" }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });

  it("renders an edit link for APPROVED quotes without a blocked work order", () => {
    renderCard(createMockQuote({ status: "APPROVED" }));

    const editLink = screen.getByRole("link", { name: /editar cotización/i });
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute("href", "/admin/quotes/quote-1/edit");
  });

  it("renders an edit link for SENT quotes", () => {
    renderCard(createMockQuote({ status: "SENT" }));

    const editLink = screen.getByRole("link", { name: /editar cotización/i });
    expect(editLink).toBeInTheDocument();
  });

  it("renders a duplicate button for every quote including cancelled ones", () => {
    renderCard(createMockQuote({ status: "CANCELLED" }));

    expect(screen.getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
  });

  it("does not open the preview dialog when a nested action button is clicked", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    await user.click(screen.getByRole("button", { name: /duplicar/i }));

    expect(screen.queryByRole("dialog", { name: /vista previa/i })).not.toBeInTheDocument();
  });

  it("does not open the preview dialog when an action is activated from the keyboard", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    screen.getByRole("button", { name: /duplicar/i }).focus();
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("dialog", { name: /vista previa/i })).not.toBeInTheDocument();
  });
});
