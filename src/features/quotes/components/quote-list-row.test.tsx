import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteListRow } from "./quote-list-row";
import type { listQuotes } from "@/features/quotes/queries";
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
    administrative: false, deletedAt: null, retentionStartedAt: null,
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

function createReadySaleQuote(overrides: Partial<QuoteListItem> = {}): QuoteListItem {
  const [item] = createMockQuote().items;

  return createMockQuote({
    operation: "SALE",
    status: "APPROVED",
    items: [
      {
        ...item,
        type: "MATERIAL",
        description: "Filtro de aceite",
      },
    ],
    ...overrides,
  });
}

function createSaleConversionActions(): WorkOrderActions {
  return {
    convert: vi.fn().mockResolvedValue({ success: true }),
  };
}

function renderRow(quote: QuoteListItem, options: { workOrderActions?: WorkOrderActions } = {}) {
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
          workOrderActions={options.workOrderActions}
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

  it("renders commercial authorization and cancellation for draft quotes", () => {
    renderRow(createMockQuote());

    expect(screen.getByRole("button", { name: /autorizar cotización c-001/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gestionar trabajo/i })).toBeInTheDocument();
  });

  it("renders a pending-price draft without payment actions", () => {
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
    expect(screen.getByRole("button", { name: /cancelar cotización c-001/i })).toBeInTheDocument();
  });

  it("renders status badge", () => {
    renderRow(createMockQuote({ status: "APPROVED" }));

    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it.each(["DRAFT", "SENT", "APPROVED"] as const)("renders work order operations trigger for %s quotes", (status) => {
    renderRow(createMockQuote({ status }));

    expect(screen.getByRole("button", { name: /gestionar trabajo/i })).toBeInTheDocument();
  });

  it("disables the desktop sale conversion trigger when a stored SALE quote is commercially incomplete", () => {
    renderRow(
      createReadySaleQuote({
        subtotalCents: null,
        taxCents: null,
        totalCents: null,
      }),
      { workOrderActions: createSaleConversionActions() },
    );

    expect(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i })).toBeDisabled();
  });

  it("disables the desktop sale conversion trigger when a stored SALE quote has unsupported items", () => {
    const [unsupportedItem] = createMockQuote().items;

    renderRow(
      createReadySaleQuote({ items: [{ ...unsupportedItem, type: "LABOR" }] }),
      { workOrderActions: createSaleConversionActions() },
    );

    expect(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i })).toBeDisabled();
  });

  it("keeps eligible stored SALE quotes actionable from the desktop row", () => {
    renderRow(createReadySaleQuote(), { workOrderActions: createSaleConversionActions() });

    expect(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i })).toBeEnabled();
  });

  it("keeps the desktop sale conversion trigger visible but disabled when a SALE payable note already exists", () => {
    renderRow(
      createReadySaleQuote({
        payableNote: { id: "note-1" } as QuoteListItem["payableNote"],
        workOrder: null,
      }),
      { workOrderActions: createSaleConversionActions() },
    );

    expect(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i })).toBeDisabled();
  });

  it("keeps QTSC-INT-002 SALE conversion actionable when a confirmed quote has pending-price items", () => {
    const [pricedItem] = createMockQuote().items;

    renderRow(
      createReadySaleQuote({
        subtotalCents: 10000,
        taxCents: 1600,
        totalCents: 11600,
        items: [
          { ...pricedItem, type: "MATERIAL", description: "Filtro de aceite" },
          {
            ...pricedItem,
            id: "item-pending-price",
            type: "MATERIAL",
            description: "Aditivo pendiente de precio",
            quantity: 2,
            unitPriceCents: null,
            totalCents: null,
            sortOrder: 1,
          },
        ],
      }),
      { workOrderActions: createSaleConversionActions() },
    );

    expect(screen.getByText("$116.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i })).toBeEnabled();
  });

  it("preserves payment actions for approved quotes with work in progress", () => {
    renderRow(createMockQuote({
      status: "APPROVED",
      workOrder: { number: "OT-001", status: "IN_PROGRESS" } as QuoteListItem["workOrder"],
    }));

    expect(screen.getByRole("button", { name: /link de pago/i })).toBeInTheDocument();
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

  it("renders direct action buttons (Editar, Duplicar, Compartir)", () => {
    renderRow(createMockQuote());

    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /duplicar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compartir cotización c-001/i })).toBeInTheDocument();
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
