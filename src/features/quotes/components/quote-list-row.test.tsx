import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    title: "Mantenimiento preventivo",
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
    administrative: false, deletedAt: null,
    operationalDate: new Date("2026-06-15T00:00:00.000Z"),
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
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
    vehicle: {
      id: "veh-1",
      customerId: "cust-1",
      economicNumber: null,
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
        type: "LABOR",
        description: "Cambio de aceite",
        quantity: 1,
        unitPriceCents: 10000,
        totalCents: 10000,
        includeInPayroll: false,
        customRatePercent: null,
        customPayrollBaseCents: null,
        sortOrder: 0,
      },
    ],
    workOrder: null,
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

function renderRow(quote: QuoteListItem) {
  return render(
    <table>
      <tbody>
        <QuoteListRow
          quote={quote}
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

  it("renders cancellation in overflow but not commercial authorization for draft quotes", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote());

    expect(screen.queryByRole("button", { name: /autorizar cotización c-001/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("renders a pending-price draft without payment actions", async () => {
    const user = userEvent.setup();
    const quote = createMockQuote();

    renderRow(createMockQuote({
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
      items: quote.items.map((item) => ({ ...item, unitPriceCents: null, totalCents: null })),
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compartir cotización c-001/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("renders status badge", () => {
    renderRow(createMockQuote({ status: "APPROVED" }));

    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it.each(["DRAFT", "SENT", "APPROVED"] as const)("renders work order operations trigger for %s quotes", async (status) => {
    const user = userEvent.setup();
    renderRow(createMockQuote({ status }));

    if (status === "APPROVED") {
      expect(screen.getByRole("button", { name: /gestionar trabajo/i })).toBeInTheDocument();
    } else {
      await user.click(screen.getByRole("button", { name: /más acciones/i }));
      expect(within(screen.getByRole("dialog")).getByRole("button", { name: /gestionar trabajo/i })).toBeInTheDocument();
    }
  });

  it("preserves payment actions in overflow for approved quotes with work in progress", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
    }));

    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /link de pago/i })).toBeInTheDocument();
  });

  it("hides payment actions when an approved in-progress quote has incomplete totals", () => {
    renderRow(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
      subtotalCents: null,
      taxCents: null,
      totalCents: null,
    }));

    expect(screen.queryByRole("button", { name: /link de pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gestionar orden de trabajo ot-001/i })).toBeInTheDocument();
  });

  it("does not render cancel action for cancelled quotes", () => {
    renderRow(createMockQuote({ status: "CANCELLED" }));

    expect(screen.queryByRole("button", { name: /cancelar cotización/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /autorizar cotización/i })).not.toBeInTheDocument();
  });

  it("renders direct action buttons (Editar, Compartir) and duplicate in overflow", async () => {
    const user = userEvent.setup();
    renderRow(createMockQuote());

    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compartir cotización c-001/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
  });

  it("keeps non-completed quote-row printing on the quote route", () => {
    renderRow(createMockQuote({
      id: "quote-row-1",
      status: "APPROVED",
      workOrder: { id: "wo-row-active-1", number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
    }));

    const print = screen.getByRole("button", { name: /imprimir cotización/i });
    expect(print).toHaveAttribute(
      "data-print-url",
      "/admin/quotes/quote-row-1/print?returnTo=/admin/quotes",
    );
    expect(print.getAttribute("data-print-url")).not.toContain("/admin/notas/");
    expect(print).toHaveClass("min-h-11", "min-w-11");
  });

  it("routes completed quote-row printing to the work-order note", () => {
    renderRow(createMockQuote({
      id: "quote-row-completed-1",
      status: "APPROVED",
      workOrder: { id: "wo-row-completed-1", number: "OT-002", status: "COMPLETED" } as QuoteListItem["workOrder"],
    }));

    const print = screen.getByRole("button", { name: /imprimir cotización/i });
    expect(print).toHaveAttribute("data-print-url", "/admin/notas/wo-row-completed-1/print?returnTo=/admin/notas");
    expect(print.getAttribute("data-print-url")).not.toContain("/admin/quotes/");
  });
});
