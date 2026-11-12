import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteListCard } from "./quote-mobile-card";
import type { listQuotes } from "@/features/quotes/queries";
import type { PaymentRequest } from "@/generated/prisma/client";
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

function moreActions(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: "Más acciones de cotización C-001" }));
}

function moreDialog() {
  return screen.getByRole("dialog", { name: "Acciones de cotización" });
}

describe("QuoteListCard", () => {
  it("shows the work-order reference once in an undecorated information row", () => {
    renderCard(createMockQuote({
      workOrder: { number: "OT-758", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
    }));

    const preview = screen.getByRole("group", { name: "Abrir vista previa de C-001" });
    expect(within(preview).getAllByText("OT-758")).toHaveLength(1);
    const row = within(preview).getByText("Orden de trabajo").closest("p");
    expect(row).not.toBeNull();
    for (const decoration of ["border", "bg-[var(--color-surface-muted)]", "shadow-[var(--shadow-xs)]"]) {
      expect(row).not.toHaveClass(decoration);
    }
  });

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

    expect(screen.getByText("Fecha de cotización")).toBeInTheDocument();
    expect(screen.getByText(/15 de junio de 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/creada el/i)).not.toBeInTheDocument();
  });

  it("opens the preview dialog from the keyboard", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    screen.getByRole("group", { name: /abrir vista previa de c-001/i }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cotización C-001")).toBeInTheDocument();
  });

  it("uses the shared entity card: shadow only, focusable, with the actions footer at the bottom", () => {
    renderCard(createMockQuote());

    const card = screen.getByRole("group", { name: /abrir vista previa de c-001/i });
    expect(card).toHaveAttribute("tabindex", "0");
    expect(card).toHaveClass("shadow-[var(--shadow-card)]", "hover:shadow-[var(--shadow-card-hover)]", "focus-visible:ring-2");
    expect(card.className).not.toMatch(/(^|\s)border(-|\s|$)/);
    expect(card).toHaveClass("flex", "h-full", "flex-col");
    expect(screen.getByTestId("entity-card-footer")).toHaveClass("mt-auto");
  });

  it("keeps the title and date area at stable heights and exposes the full title", () => {
    const fullTitle = "A long title that should be clamped after two lines while preserving its full accessible title";
    renderCard(createMockQuote({ title: fullTitle, paymentDueDate: null }));

    const title = screen.getByRole("heading", { level: 3 });
    expect(title).toHaveAttribute("title", fullTitle);
    expect(title).toHaveClass("line-clamp-2", "min-h-12");
    expect(screen.getByTestId("quote-key-data")).toHaveClass("min-h-12");
    expect(screen.queryByText(/vencimiento pago:/i)).not.toBeInTheDocument();
  });

  it.each(["ASSIGNED", "IN_PROGRESS"] as const)("does not expose a stored payment deadline before issuance (%s)", (status) => {
    renderCard(createMockQuote({
      paymentDueDate: new Date("2026-09-30T12:00:00Z"),
      workOrder: { number: "OT-001", status } as QuoteListItem["workOrder"],
    }));
    expect(screen.queryByText("Vencimiento pago")).not.toBeInTheDocument();
    expect(screen.getByText("Vigente hasta")).toBeInTheDocument();
  });

  it("makes authorization the sent quote's tonal primary action with the tools in fixed order and the flow in More actions", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "SENT", activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

    const state = screen.getByTestId("entity-card-state");
    const authorize = within(state).getByRole("button", { name: "Autorizar cotización C-001" });
    expect(authorize).toHaveClass("bg-[var(--color-tonal-bg)]", "text-[var(--color-tonal-fg)]");
    expect(authorize).toHaveClass("h-[var(--control-sm)]");
    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    expect(edit).toBeInTheDocument();
    const print = screen.getByRole("button", { name: "Imprimir cotización C-001" });
    expect(print).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Imprimir cotización C-001" })).toHaveLength(1);
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toHaveClass("border", "h-[var(--control-sm)]", "w-[var(--control-sm)]");
    expect(screen.queryByRole("button", { name: "Duplicar cotización" })).not.toBeInTheDocument();

    await moreActions(user);

    const overflow = moreDialog();
    expect(within(overflow).queryByRole("button", { name: "Imprimir cotización C-001" })).not.toBeInTheDocument();
    expect(within(overflow).queryByRole("button", { name: "Autorizar cotización C-001" })).not.toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Duplicar cotización" })).toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Cancelar cotización C-001" })).toBeInTheDocument();
    expect(within(overflow).getByRole("button", { name: "Archivar cotización C-001" })).toBeInTheDocument();
    const remove = within(overflow).getByRole("button", { name: "Eliminar cotización C-001" });
    expect(remove.closest("div[class*='border-t']")).not.toBeNull();
  });

  it("makes draft sharing the primary action and keeps authorization and conversion in More actions", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote());

    const share = within(screen.getByTestId("entity-card-state")).getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toHaveClass("bg-[var(--color-tonal-bg)]");
    expect(share).toBeEnabled();
    expect(screen.getByTestId("entity-card-tools")).not.toContainElement(share);
    await moreActions(user);
    expect(within(moreDialog()).getByRole("button", { name: "Autorizar cotización C-001" })).toBeInTheDocument();
    expect(within(moreDialog()).getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toBeEnabled();
  });

  it("keeps Edit, Share, and Print icon-only at fixed compact dimensions", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "SENT", activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

    const tools = screen.getByTestId("entity-card-tools");
    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    const print = screen.getByRole("button", { name: "Imprimir cotización C-001" });
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    const more = screen.getByRole("button", { name: "Más acciones de cotización C-001" });
    expect(tools).toContainElement(edit);
    expect(edit).toHaveClass("h-[var(--control-sm)]", "w-[var(--control-sm)]", "shrink-0", "px-0");
    expect(within(edit).getByText("Editar")).toHaveClass("sr-only");
    expect(within(edit).getByText("Editar").previousElementSibling).toHaveClass("h-5", "w-5");
    expect(print).toHaveAttribute("aria-label", "Imprimir cotización C-001");
    expect(print).toHaveAttribute("title", "Imprimir cotización C-001");
    expect(print).toHaveClass("h-[var(--control-sm)]", "w-[var(--control-sm)]", "shrink-0", "px-0");
    expect(print.querySelector("svg")).toHaveClass("h-5", "w-5");
    expect(within(print).getByText("Imprimir")).toHaveClass("sr-only");
    expect(share).toHaveAttribute("aria-label", "Compartir cotización C-001");
    expect(share).toHaveClass("border");
    expect(within(share).getByText("Compartir")).toHaveClass("sr-only");
    expect(more).toHaveClass("h-[var(--control-sm)]", "w-[var(--control-sm)]", "shrink-0", "px-0");
    expect(within(more).getByText("Más acciones")).toHaveClass("sr-only");
    expect(screen.getByTestId("quote-overflow-action")).toHaveClass("shrink-0");
    await user.click(more);
    expect(within(moreDialog()).getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toBeInTheDocument();
    expect(share).toBeInTheDocument();
  });

  it("renders the quote actions in fixed order (Editar, Imprimir, Compartir, ⋯) with the state action on the right", () => {
    renderCard(createMockQuote({
      status: "SENT",
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    const footer = screen.getByTestId("entity-card-footer");
    expect(Array.from(footer.querySelectorAll<HTMLElement>("[aria-label]")).map((element) => element.getAttribute("aria-label"))).toEqual([
      "Editar cotización C-001",
      "Imprimir cotización C-001",
      "Compartir cotización C-001",
      "Más acciones de cotización C-001",
      "Autorizar cotización C-001",
    ]);
    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toHaveClass("h-[var(--control-sm)]", "w-[var(--control-sm)]", "shrink-0", "px-0");
    expect(within(share).getByText("Compartir")).toHaveClass("sr-only");
    expect(screen.getByRole("button", { name: "Más acciones de cotización C-001" })).not.toHaveClass("border");
  });

  it("keeps Share consistently styled on an unshared quote", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "SENT" }));

    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toHaveClass("border", "h-[var(--control-sm)]", "w-[var(--control-sm)]");
    expect(share).not.toHaveClass("bg-[var(--color-btn-primary)]", "bg-[var(--color-blue-tint)]");
    expect(within(share).getByText("Compartir")).toHaveClass("sr-only");
    await moreActions(user);
    expect(within(moreDialog()).getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toBeEnabled();
  });

  it("keeps the flow visible but disabled for a duplicate SALE note", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({
      status: "SENT",
      operation: "SALE",
      items: createMockQuote().items.map((item) => ({ ...item, type: "MATERIAL" })),
      payableNote: { id: "note-1" } as QuoteListItem["payableNote"],
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    expect(screen.getByRole("button", { name: "Compartir cotización C-001" })).toHaveClass("h-[var(--control-sm)]", "w-[var(--control-sm)]");
    await moreActions(user);
    const flow = within(moreDialog()).getByRole("button", { name: "Crear nota de venta para cotización C-001" });
    expect(flow).toBeDisabled();
    expect(flow).toHaveClass("w-full", "disabled:opacity-50", "disabled:bg-[var(--color-surface-muted)]", "disabled:text-[var(--color-text-muted)]");
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
    expect(share).toHaveClass("bg-[var(--color-tonal-bg)]");
    expect(screen.queryByRole("button", { name: /cancelar cotización c-001/i })).not.toBeInTheDocument();
    await moreActions(user);
    expect(within(moreDialog()).getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("keeps Share as the tonal primary action, disabled, when a draft is missing a customer", () => {
    renderCard(createMockQuote({
      customer: null,
      customerId: null,
    }));

    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    expect(share).toBeInTheDocument();
    expect(share).toHaveClass("bg-[var(--color-tonal-bg)]");
    expect(share).not.toHaveClass("bg-[var(--color-btn-primary)]");
    expect(share).toBeDisabled();
  });

  it("enables sharing a commercially ready draft", () => {
    renderCard(createMockQuote());

    expect(screen.getByRole("button", { name: "Compartir cotización C-001" })).toBeEnabled();
  });

  it("keeps payment links available through overflow for approved in-progress work", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
      activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"],
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    await moreActions(user);
    expect(within(moreDialog()).getByRole("button", { name: "Link de pago" })).toBeInTheDocument();
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
    expect(within(screen.getByTestId("entity-card-state")).getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toHaveClass("bg-[var(--color-tonal-bg)]");
  });

  it("keeps eligible DRAFT WORK assignment accessible under More and preserves acceptance", async () => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status: "DRAFT", activeSharedQuote: { token: "shared-quote-token" } as QuoteListItem["activeSharedQuote"] }));

    await moreActions(user);
    const flow = within(moreDialog()).getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    expect(flow).toBeEnabled();
    await user.click(flow);
    expect(screen.getByText("¿El cliente aceptó la cotización?")).toBeInTheDocument();
  });

  it("keeps an eligible DRAFT SALE conversion action available without a WORK acceptance prompt", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();
    renderCard(createMockQuote({
      status: "DRAFT",
      operation: "SALE",
      items: quote.items.map((item) => ({ ...item, type: "MATERIAL" })),
    }));

    await moreActions(user);
    const flow = within(moreDialog()).getByRole("button", { name: "Crear nota de venta para cotización C-001" });
    expect(flow).toBeEnabled();
    await user.click(flow);
    expect(screen.getByRole("dialog")).toHaveTextContent("Crear nota de venta");
    expect(screen.queryByText("¿El cliente aceptó la cotización?")).not.toBeInTheDocument();
  });

  it.each(["REJECTED", "CANCELLED", "ARCHIVED"] as const)("keeps tools visible and the flow reachable but disabled for %s", async (status) => {
    const user = userEvent.setup();
    renderCard(createMockQuote({ status }));

    const share = screen.getByRole("button", { name: "Compartir cotización C-001" });
    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    const print = screen.getByRole("button", { name: "Imprimir cotización C-001" });
    expect(share).toBeDisabled();
    expect(edit).toBeInTheDocument();
    if (status === "CANCELLED") expect(edit).toBeDisabled();
    expect(print).toBeEnabled();
    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /autorizar cotización/i })).not.toBeInTheDocument();

    await moreActions(user);
    expect(within(moreDialog()).getByRole("button", { name: "Asignar trabajo para cotización C-001" })).toBeDisabled();
  });

  it("makes restore the archived quote's primary action", () => {
    renderCard(createMockQuote({ status: "ARCHIVED" }));

    expect(within(screen.getByTestId("entity-card-state")).getByRole("button", { name: /restaurar cotización c-001/i })).toBeInTheDocument();
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

    await moreActions(user);
    const flow = within(moreDialog()).getByRole("button", { name: "Asignar trabajo para cotización C-001" });
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

  it("shows the unit identity as ECO plus model, with the driver absent because quotes carry none", () => {
    renderCard(createMockQuote({
      vehicle: {
        id: "veh-1", customerId: "cust-1", economicNumber: "E-12", brand: "Ford", model: "F-150", year: 2020, color: null,
        plate: "ABC-123", notes: null, createdAt: new Date(), updatedAt: new Date(),
      } as QuoteListItem["vehicle"],
    }));

    expect(screen.getByTestId("entity-card-unit")).toHaveTextContent("ECO E-12 · Ford F-150");
    expect(screen.queryByTestId("entity-card-driver")).not.toBeInTheDocument();
  });

  it("falls back to plates and model when the quote vehicle has no economic number", () => {
    renderCard(createMockQuote({
      vehicle: {
        id: "veh-1", customerId: "cust-1", economicNumber: null, brand: "Ford", model: "F-150", year: 2020, color: null,
        plate: "ABC-123", notes: null, createdAt: new Date(), updatedAt: new Date(),
      } as QuoteListItem["vehicle"],
    }));

    expect(screen.getByTestId("entity-card-unit")).toHaveTextContent("ABC-123 · Ford F-150");
    expect(screen.getByTestId("entity-card-unit")).not.toHaveTextContent("Sin ECO");
  });

  it("hides the unit line instead of showing placeholder text when no vehicle identity exists", () => {
    renderCard(createMockQuote({ vehicle: null, vehicleSnapshot: null }));

    expect(screen.queryByTestId("entity-card-unit")).not.toBeInTheDocument();
    expect(screen.queryByText(/sin vehículo/i)).not.toBeInTheDocument();
  });

  it("does not print a work-order placeholder on a work quote without an order", () => {
    renderCard(createMockQuote({ operation: "WORK", workOrder: null as QuoteListItem["workOrder"] }));

    expect(screen.queryByText("Sin orden de trabajo")).not.toBeInTheDocument();
  });

  it("shows the folio as the bare number, without the word Folio", () => {
    renderCard(createMockQuote());

    expect(screen.getByText("C-001")).toBeInTheDocument();
    expect(screen.queryByText(/^Folio/)).not.toBeInTheDocument();
  });

  it("lists the key data as label and value rows, each with a top line and no icon", () => {
    renderCard(createMockQuote());

    const keyData = screen.getByTestId("quote-key-data");
    const rows = within(keyData).getAllByText(/^(Fecha de cotización|Vigente hasta)$/).map((label) => label.parentElement);
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toHaveClass("border-t");
      expect(row?.querySelector("svg")).toBeNull();
    }
  });
});
