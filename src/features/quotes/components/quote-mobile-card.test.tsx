import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteListCard } from "./quote-mobile-card";
import type { listQuotes } from "@/features/quotes/queries";
import type { PaymentRequest } from "@prisma/client";
import type { WorkOrderActions } from "@/features/work-orders/components/work-order-operations-dialog";

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
  const { folio, issuedAt, ...rest } = overrides;
  return {
    id: "quote-1",
    submissionKey: "key-1",
    submissionHash: "hash-1",
    customerId: "cust-1",
    vehicleId: "veh-1",
    number: "C-001",
    folio: folio ?? null,
    issuedAt: issuedAt ?? null,
    status: "DRAFT",
    operation: "WORK",
    title: "Servicio general",
    description: null,
    vehicleSnapshot: null,
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 1600,
    totalCents: 11600,
    taxEnabled: true,
    validUntil: new Date("2026-12-31"),
    paymentDueDate: null,
    isLocked: false,
    lockedAt: null,
    lockedById: null,
    lockedReason: null,
    approvedAt: null,
    administrative: false, deletedAt: null, retentionStartedAt: null,
    operationalDate: new Date("2026-06-15T00:00:00.000Z"),
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-01"),
    sections: [],
    customer: {
      id: "cust-1",
      name: "Constructora del Norte",
      commercialName: null,
      legalName: null,
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
        type: "LABOR",
        description: "Cambio de aceite",
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
        includeInPayroll: false,
        customRatePercent: null,
        customPayrollBaseCents: null,
        payrollConfigLockedAt: null,
        sortOrder: 0,
      },
    ],
    workOrder: null,
    payableNote: null,
    paymentRequests: [],
    sharedQuotes: [],
    activeSharedQuote: null,

    paidCents: 0,
    remainingCents: 11600,
    customerContactId: null,
    customerFiscalProfileId: null,
    customerSnapshot: null,
    contactSnapshot: null,
    customerContact: null,
    customerFiscalProfile: null,



    ...rest,
  };
}

function renderCard(quote: QuoteListItem, workOrderActions: WorkOrderActions = { assign: vi.fn(), convert: vi.fn() }) {
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
      duplicateAction={vi.fn()}
      deleteAction={vi.fn()}
      archiveAction={vi.fn()}
      restoreAction={vi.fn()}
      customers={[{ id: "cust-1", name: "Constructora del Norte" }]}
      saveAction={vi.fn()}
      searchCustomersAction={vi.fn()}
      workOrderActions={workOrderActions}
    />,
  );
}

describe("QuoteListCard", () => {
  it("can shrink within a grid track", () => {
    const { container } = renderCard(createMockQuote());

    expect(container.firstElementChild).toHaveClass("min-w-0", "w-full");
  });

  it("forwards persisted SALE intent to the conversion dialog", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    renderCard(createMockQuote({ status: "APPROVED", operation: "SALE", items: quote.items.map((item) => ({ ...item, type: "MATERIAL" })), activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }), {
      convert: vi.fn(() => Promise.resolve({ success: true })),
    });

    const trigger = screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i });
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toHaveTextContent("Crear nota de venta");
    expect(screen.getByRole("button", { name: /crear nota de venta/i })).toBeInTheDocument();
    expect(screen.queryByText("Asignación de personal")).not.toBeInTheDocument();
  });

  it("labels a SALE quote without a work order as a parts sale", () => {
    renderCard(createMockQuote({ operation: "SALE" }));

    expect(screen.getByText("Venta de refacciones")).toBeInTheDocument();
    expect(screen.queryByText("Sin orden de trabajo")).not.toBeInTheDocument();
  });

  it("opens the preview dialog when the card is clicked", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    await user.click(screen.getByLabelText(/abrir vista previa de c-001/i));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
    expect(screen.getAllByText(/cambio de aceite/i)[0]).toBeInTheDocument();
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

  it("uses the operational card body as the padded, clickable quote-card reference surface", () => {
    renderCard(createMockQuote());

    const preview = screen.getByRole("button", { name: /abrir vista previa de c-001/i });
    expect(preview.parentElement).toHaveClass("p-4");
    expect(preview).toHaveClass("w-full", "rounded-[var(--radius-sm)]", "focus-visible:ring-offset-2");
    expect(preview).not.toHaveClass("hover:bg-[var(--color-surface-muted)]");
    expect(preview).toHaveClass("focus-visible:ring-2");
    expect(preview.parentElement).toHaveClass("flex", "h-full", "flex-col");
    expect(preview).toHaveClass("flex-1");
    expect(screen.getByTestId("quote-secondary-actions").parentElement).toHaveClass("mt-auto");
  });

  it("keeps the title and date area at stable heights and exposes the full title", () => {
    const fullTitle = "A long title that should be clamped after two lines while preserving its full accessible title";
    renderCard(createMockQuote({ title: fullTitle, paymentDueDate: null }));

    const title = screen.getByRole("heading", { level: 3 });
    expect(title).toHaveAttribute("title", fullTitle);
    expect(title).toHaveClass("line-clamp-2", "min-h-12");
    expect(screen.getByTestId("quote-dates")).toHaveClass("min-h-12");
    expect(screen.getByText(/vencimiento pago: —/i)).toBeInTheDocument();
  });

  it("keeps the flow action labeled and full-width above compact actions", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "SENT", activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

    const primary = screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    expect(primary).toHaveClass("bg-[image:var(--gradient-primary)]");
    expect(primary).toHaveClass("h-9", "w-full");
    expect(within(primary).getByText("Asignar trabajo")).not.toHaveClass("sr-only");
    expect(screen.getByTestId("quote-primary-action")).toHaveClass("w-full");
    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    expect(edit).toBeInTheDocument();
    const print = screen.getByRole("button", { name: "Imprimir cotización C-001" });
    expect(print).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Imprimir cotización C-001" })).toHaveLength(1);
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toHaveClass("border", "h-11", "w-11");
    expect(screen.queryByRole("button", { name: "Duplicar cotización" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));

    const overflow = screen.getByRole("dialog", { name: "Acciones de cotización" });
    expect(within(overflow).queryByRole("button", { name: "Imprimir cotización C-001" })).not.toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Duplicar cotización" })).toBeInTheDocument();
     expect(within(overflow).getByRole("button", { name: "Autorizar cotización C-001" })).toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Cancelar cotización C-001" })).toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Archivar cotización C-001" })).toBeInTheDocument();
    const remove = within(overflow).getByRole("button", { name: "Eliminar cotización C-001" });
    expect(remove.closest("div[class*='border-t']")).not.toBeNull();
  });

  it("keeps Edit, Share, and Print icon-only at fixed compact dimensions", () => {
    renderCard(createMockQuote({ activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

    const secondaryActions = screen.getByTestId("quote-secondary-actions");
    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    const print = screen.getByRole("button", { name: "Imprimir cotización C-001" });
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    const more = screen.getByRole("button", { name: "Más acciones de cotización C-001" });
    expect(secondaryActions).toHaveClass("grid", "gap-2");
    expect(edit).toHaveClass("h-11", "w-11", "shrink-0", "px-0", "sm:h-9", "sm:w-9");
    expect(within(edit).getByText("Editar")).toHaveClass("sr-only");
    expect(within(edit).getByText("Editar").previousElementSibling).toHaveClass("h-5", "w-5");
    expect(print).toHaveAttribute("aria-label", "Imprimir cotización C-001");
    expect(print).toHaveAttribute("title", "Imprimir cotización C-001");
    expect(print).toHaveClass("h-11", "w-11", "shrink-0", "px-0", "sm:h-9", "sm:w-9");
    expect(print.querySelector("svg")).toHaveClass("h-5", "w-5");
    expect(within(print).getByText("Imprimir")).toHaveClass("sr-only");
    expect(share).toHaveAttribute("aria-label", "Compartir cotización C-001");
    expect(share).toHaveClass("border");
    expect(within(share).getByText("Compartir")).toHaveClass("sr-only");
    expect(more).toHaveClass("h-11", "w-11", "shrink-0", "px-0", "sm:h-9", "sm:w-9", "sm:px-0");
    expect(within(more).getByText("Más acciones")).toHaveClass("sr-only");
    expect(screen.getByTestId("quote-overflow-action")).toHaveClass("shrink-0");
    expect(screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toBeInTheDocument();
    expect(share).toBeInTheDocument();
  });

  it("renders the four quote actions in fixed order with an extra-actions menu", () => {
    renderCard(createMockQuote({
      status: "SENT",
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    const secondaryActions = screen.getByTestId("quote-secondary-actions");
    expect(secondaryActions).toHaveClass("grid", "gap-2");
    expect(Array.from(secondaryActions.querySelectorAll<HTMLElement>("[aria-label]")).map((element) => element.getAttribute("aria-label"))).toEqual([
      "Asignar trabajo para cotización C-001",
      "Editar cotización C-001",
      "Imprimir cotización C-001",
      "Compartir cotización C-001",
      "Más acciones de cotización C-001",
    ]);
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toHaveClass("h-11", "w-11", "shrink-0", "px-0", "sm:h-9", "sm:w-9");
    expect(within(share).getByText("Compartir")).toHaveClass("sr-only");
    expect(screen.getByRole("button", { name: "Más acciones de cotización C-001" })).not.toHaveClass("border");
  });

  it("keeps Share consistently styled on an unshared quote", () => {
    renderCard(createMockQuote({ status: "SENT" }));

    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    const flow = screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    expect(share).toHaveClass("border", "h-11", "w-11");
    expect(share).not.toHaveClass("bg-[image:var(--gradient-primary)]", "bg-[var(--color-blue-tint)]");
    expect(flow).toHaveClass("bg-[image:var(--gradient-primary)]", "h-9", "w-full");
    expect(within(share).getByText("Compartir")).toHaveClass("sr-only");
  });

  it("keeps the flow visible but disabled for a duplicate SALE note", () => {
    renderCard(createMockQuote({
      status: "SENT",
      operation: "SALE",
      items: createMockQuote().items.map((item) => ({ ...item, type: "MATERIAL" })),
      payableNote: { id: "note-1" } as QuoteListItem["payableNote"],
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    const flow = screen.getByRole("button", { name: "Crear nota de venta para cotización C-001" });
    expect(flow).toBeDisabled();
    expect(flow).toHaveClass("w-full", "disabled:opacity-50", "disabled:bg-[var(--color-surface-muted)]", "disabled:text-[var(--color-text-muted)]");
    expect(screen.getByRole("button", { name: "Compartir cotización C-001" })).toHaveClass("h-11", "w-11");
  });

  it("renders a pending-price draft without payment actions", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();

    renderCard(createMockQuote({
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
      items: quote.items.map((item) => ({ ...item, unitPriceCents: null, totalCents: null })),
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar cotización c-001/i })).toBeInTheDocument();
    const share = screen.getByRole("button", { name: /compartir cotización c-001/i });
    expect(share).toBeInTheDocument();
    expect(share).toHaveClass("border");
    expect(screen.queryByRole("button", { name: /cancelar cotización c-001/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));
    expect(within(screen.getByRole("dialog", { name: "Acciones de cotización" })).getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("keeps Share consistently styled when a draft is missing a customer", () => {
    renderCard(createMockQuote({
      customer: null,
      customerId: null,
    }));

    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toBeInTheDocument();
    expect(share).toHaveClass("border");
    expect(share).not.toHaveClass("bg-[image:var(--gradient-primary)]", "bg-[var(--color-blue-tint)]");
  });

  it("keeps payment links available through overflow for approved in-progress work", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));
    expect(within(screen.getByRole("dialog", { name: "Acciones de cotización" })).getByRole("button", { name: "Link de pago" })).toBeInTheDocument();
  });

  it("hides payment actions when an approved in-progress quote has incomplete totals", () => {
    renderCard(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toHaveClass("bg-[image:var(--gradient-primary)]");
  });

  it("makes work-order conversion the sent quote primary action while retaining authorization in overflow", async () => {
    const user = userEvent.setup();
     renderCard(createMockQuote({ status: "SENT", activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

      expect(screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toHaveClass("bg-[image:var(--gradient-primary)]");
    await user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));
     expect(within(screen.getByRole("dialog", { name: "Acciones de cotización" })).getByRole("button", { name: "Autorizar cotización C-001" })).toBeInTheDocument();
  });

  it("exposes authorization for corrected DRAFT quotes and preserves eligible WORK acceptance", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "DRAFT", activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

    const flow = screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    expect(flow).toBeEnabled();
    await user.click(flow);
    expect(screen.getByText("¿El cliente aceptó la cotización?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar diálogo de orden de trabajo" }));
    await user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));
    expect(within(screen.getByRole("dialog", { name: "Acciones de cotización" })).getByRole("button", { name: "Autorizar cotización C-001" })).toBeInTheDocument();
  });

  it("keeps an eligible DRAFT SALE conversion action available without a WORK acceptance prompt", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    renderCard(createMockQuote({
      status: "DRAFT",
      operation: "SALE",
      items: quote.items.map((item) => ({ ...item, type: "MATERIAL" })),
    }));

    const flow = screen.getByRole("button", { name: "Crear nota de venta para cotización C-001" });
    expect(flow).toBeEnabled();
    await user.click(flow);
    expect(screen.getByRole("dialog")).toHaveTextContent("Crear nota de venta");
    expect(screen.queryByText("¿El cliente aceptó la cotización?")).not.toBeInTheDocument();
  });

  it.each(["REJECTED", "CANCELLED", "ARCHIVED"] as const)("keeps all four actions visible and disables ineligible flow/share for %s", (status) => {
    renderCard(createMockQuote({ status }));

    const flow = screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    const print = screen.getByRole("button", { name: "Imprimir cotización C-001" });
    expect(flow).toBeDisabled();
    expect(share).toBeDisabled();
    expect(edit).toBeInTheDocument();
    if (status === "CANCELLED") expect(edit).toBeDisabled();
    expect(print).toBeEnabled();
    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /autorizar cotización/i })).not.toBeInTheDocument();
  });

  it("keeps restore available in overflow for archived quotes", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "ARCHIVED" }));

    await user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));
    expect(within(screen.getByRole("dialog", { name: "Acciones de cotización" })).getByRole("button", { name: /restaurar cotización c-001/i })).toBeInTheDocument();
  });

  it.each(["DRAFT", "SENT"] as const)("keeps WORK start enabled with pending prices for %s and retains acceptance prompt", async (status) => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    renderCard(createMockQuote({
      status,
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
      items: quote.items.map((item) => ({ ...item, unitPriceCents: null, totalCents: null })),
    }));

    const flow = screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    expect(flow).toBeEnabled();
    await user.click(flow);
    expect(screen.getByText("¿El cliente aceptó la cotización?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /asignar e iniciar trabajo/i })).toBeInTheDocument();
  });

  it("keeps active quote printing inline on the quote route", () => {
    renderCard(createMockQuote({
      id: "quote-mobile-1",
      status: "APPROVED",
      workOrder: { id: "wo-mobile-active-1", number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
    }));

    const print = screen.getByRole("button", { name: /imprimir cotización/i });
    expect(print).toHaveAttribute(
      "data-print-url",
      "/admin/quotes/quote-mobile-1/print?returnTo=/admin/quotes",
    );
    expect(print.getAttribute("data-print-url")).not.toContain("/admin/notas/");
    expect(screen.getAllByRole("button", { name: /imprimir cotización/i })).toHaveLength(1);
  });

  it("routes completed document printing inline to the work-order note", () => {
    renderCard(createMockQuote({
      id: "quote-mobile-completed-1",
      status: "APPROVED",
      workOrder: { id: "wo-mobile-completed-1", number: "OT-002", status: "COMPLETED" } as QuoteListItem["workOrder"],
    }));

    const print = screen.getByRole("button", { name: /imprimir cotización/i });
    expect(print).toHaveAttribute("data-print-url", "/admin/notas/wo-mobile-completed-1/print?returnTo=/admin/notas");
    expect(print.getAttribute("data-print-url")).not.toContain("/admin/quotes/");
    expect(screen.getAllByRole("button", { name: /imprimir cotización/i })).toHaveLength(1);
  });

});
