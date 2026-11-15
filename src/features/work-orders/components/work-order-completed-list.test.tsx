import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { WorkOrderCompletedList } from "./work-order-completed-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/quotes/components/share-quote-button", () => ({
  ShareQuoteButton: (props: { quoteNumber?: string }) => (
    <button type="button" aria-label={`Compartir cotización ${props.quoteNumber}`} title={`Compartir cotización ${props.quoteNumber}`}>
    </button>
  ),
}));

type CompletedListProps = ComponentProps<typeof WorkOrderCompletedList>;

const workOrder = {
  id: "work-order-1",
  number: "OT-001",
  status: "COMPLETED",
  paymentDueDate: new Date("2026-08-21T18:00:00Z"),
  quote: {
    id: "quote-1",
    number: "COT-001",
    status: "APPROVED",
    title: "Servicio",
    description: null,
    administrative: false,
    taxEnabled: true,
    discountCents: 0,
    operationalDate: new Date("2026-08-14"),
    customer: { name: "Cliente de prueba" },
    vehicle: null,
    totalCents: 12500,
    paidCents: 0,
    remainingCents: 12500,
    items: [],
    sections: [{ name: "Diagnóstico", items: [{ type: "SERVICE", description: "Cambio de aceite", quantity: 1, unitPriceCents: 12500 }] }],
  },
  assignments: [],
  completedAt: new Date("2026-08-14"),
  isSpecial: false,
} as unknown as CompletedListProps["workOrders"][number];

const partialWorkOrder = {
  ...workOrder,
  id: "work-order-2",
  number: "OT-002",
  paymentDueDate: new Date("2026-08-17T18:00:00Z"),
  quote: { ...workOrder.quote, id: "quote-2", number: "COT-002", paidCents: 5_000, remainingCents: 7_500 },
  completedAt: new Date("2026-08-10T18:00:00Z"),
} as CompletedListProps["workOrders"][number];

const overdueWorkOrder = {
  ...partialWorkOrder,
  id: "work-order-3",
  number: "OT-003",
  paymentDueDate: new Date("2026-08-06T18:00:00Z"),
  quote: { ...partialWorkOrder.quote, id: "quote-3", number: "COT-003" },
  completedAt: new Date("2026-07-30T18:00:00Z"),
} as CompletedListProps["workOrders"][number];

const noDueDateWorkOrder = {
  ...workOrder,
  id: "work-order-4",
  number: "OT-004",
  paymentDueDate: null,
  quote: { ...workOrder.quote, id: "quote-4", number: "COT-004", paidCents: 0, remainingCents: 12500 },
  completedAt: new Date("2026-08-14"),
} as CompletedListProps["workOrders"][number];

const longPaymentHistory = Array.from({ length: 12 }, (_, index) => ({
  id: `payment-${index + 1}`,
  paymentId: `payment-${index + 1}`,
  date: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T18:00:00Z`),
  method: index % 2 === 0 ? "CASH" : "TRANSFER",
  amountCents: 1_000,
  appliedCents: 1_000,
  paidCentsAtPayment: (index + 1) * 1_000,
  remainingCentsAtPayment: 12_500 - (index + 1) * 1_000,
  isReversed: false,
}));

describe("WorkOrderCompletedList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T18:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("renders a bounded note summary and persistent actions", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder, partialWorkOrder, overdueWorkOrder, noDueDateWorkOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
        paymentHistories={[{ workOrderId: workOrder.id, totalCents: 12_500, payments: longPaymentHistory }]}
      />,
    );

    const print = screen.getByRole("button", { name: "Imprimir nota de remisión COT-001" });
    expect(print).toHaveAttribute("title", "Imprimir nota de remisión COT-001");
    expect(print.querySelector("svg")).toHaveClass("h-5", "w-5");
    expect(print).toHaveAttribute("data-print-url", "/admin/notas/work-order-1/print?returnTo=%2Fadmin%2Fnotas");
    expect(screen.getAllByRole("button", { name: /Compartir cotización/ })).toHaveLength(4);
    expect(screen.queryByText("Historial de pagos")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nota-payment-history")).not.toBeInTheDocument();
    expect(screen.queryByText("payment-1")).not.toBeInTheDocument();
    expect(screen.getAllByText("Pendiente", { exact: true })).toHaveLength(3);
    expect(screen.getByText("Vencida", { exact: true })).toBeVisible();
    expect(screen.queryByText(/Pendiente · Saldo/)).not.toBeInTheDocument();
    expect(screen.queryByText("Completada")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("entity-card-footer")).toHaveLength(4);
  });

  it("opens payment details and history without administrative correction or reversal controls", () => {
    const correctableWorkOrder = {
      ...workOrder,
      quote: { ...workOrder.quote, activePaymentId: "pay-1", activePaymentMethod: "CASH", activePaymentAmountCents: 12_500 },
    } as unknown as CompletedListProps["workOrders"][number];

    render(
      <WorkOrderCompletedList
        workOrders={[correctableWorkOrder]}
        shareAction={vi.fn()}
         paymentHistories={[{ workOrderId: correctableWorkOrder.id, totalCents: 12_500, payments: [longPaymentHistory[0]] }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver pagos" }));
    expect(screen.getByTestId("nota-detail-dialog")).toBeInTheDocument();
    expect(screen.getByText("Historial de pagos")).toBeInTheDocument();
    expect(screen.getByTestId("nota-payment-history")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /corregir pago|revertir pago/i })).not.toBeInTheDocument();
  });

  it("renders Corregir nota trigger when admin action is provided", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        correctWorkOrderActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Corregir nota" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Corregir nota" }).querySelector("svg")).toHaveClass("h-5", "w-5");
  });

  it("renders N folio and quote folio on the card, while keeping the internal reference in detail", () => {
    const dailyWorkOrder = {
      ...workOrder,
      id: "wo-daily",
      number: "T-0926-01",
      folio: "N-140826-01",
      quote: {
        ...workOrder.quote,
        number: "0926-001",
        folio: "C-140826-01",
      },
    } as unknown as CompletedListProps["workOrders"][number];

    render(<WorkOrderCompletedList workOrders={[dailyWorkOrder]} shareAction={vi.fn()} />);

    expect(screen.getByText("N-140826-01")).toBeInTheDocument();
    expect(screen.queryByText("T-0926-01")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Cot\.\s*C-140826-01/)).toHaveLength(1);
    const card = screen.getByRole("group", { name: "Ver vista previa de nota N-140826-01" });
    expect(card).toHaveTextContent("N-140826-01");
    expect(card).not.toHaveTextContent("T-0926-01");
    fireEvent.click(screen.getByRole("button", { name: "Ver pagos" }));
    expect(screen.getByTestId("nota-detail-summary")).toHaveTextContent("Referencia interna: T-0926-01");
  });

  it("renders sharing for completed Notes", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder]} shareAction={vi.fn()} />);

    const share = screen.getByRole("button", { name: /Compartir cotización/ });
    expect(share).toHaveAttribute("aria-label", "Compartir cotización COT-001");
    expect(share).toHaveAttribute("title", "Compartir cotización COT-001");
    expect(share).not.toHaveTextContent("Compartir");
  });

  it("opens the payment dialog from the primary action and retains permitted payment registration", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Registrar pago para COT-001" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.getByRole("button", { name: "Registrar pago para COT-001" })).toBeInTheDocument();
  });

  it("keeps the required three actions visible on every note card", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder, partialWorkOrder]}
        shareAction={vi.fn()}
        correctWorkOrderActions={[
          { workOrderId: workOrder.id, action: vi.fn() },
          { workOrderId: partialWorkOrder.id, action: vi.fn() },
        ]}
      />,
    );

    expect(screen.getAllByRole("button", { name: /Compartir cotización/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Imprimir nota de remisión/ })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Corregir nota" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Registrar pago/ })).not.toBeInTheDocument();
  });

  it("opens document preview from the card and payment detail from its primary action", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
        paymentHistories={[{ workOrderId: workOrder.id, totalCents: 12_500, payments: longPaymentHistory }]}
      />,
    );
    const cardPrintAction = screen.getByRole("button", { name: "Imprimir nota de remisión COT-001" });

    fireEvent.click(screen.getByRole("button", { name: /Compartir cotización/ }));
    expect(screen.queryByTestId("nota-detail-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("group", { name: "Ver vista previa de nota COT-001" }));
    expect(screen.getByRole("heading", { name: "Nota COT-001" })).toBeInTheDocument();
    expect(screen.getAllByText("Cambio de aceite")).toHaveLength(1);
    expect(screen.queryByTestId("nota-detail-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.queryByRole("heading", { name: "Acciones de nota" })).not.toBeInTheDocument();
    expect(screen.getByTestId("nota-detail-dialog")).toBeInTheDocument();
    expect(screen.getByText("Historial de pagos")).toBeInTheDocument();
    expect(screen.getByTestId("nota-payment-history")).toBeInTheDocument();
    const detailDialog = screen.getByTestId("nota-detail-dialog");
    expect(within(detailDialog).queryByRole("button", { name: "Imprimir nota de remisión COT-001" })).not.toBeInTheDocument();
    expect(cardPrintAction).toBeInTheDocument();
    expect(cardPrintAction).toHaveAttribute("data-print-url", "/admin/notas/work-order-1/print?returnTo=%2Fadmin%2Fnotas");
    expect(within(screen.getByTestId("nota-payment-history")).getAllByRole("listitem")).toHaveLength(longPaymentHistory.length);
    expect(screen.getByTestId("quote-payment-balance-indicator")).toHaveTextContent(/Saldo pendiente\s*\$125\.00/);
    expect(screen.getByTestId("note-due-date")).toHaveTextContent(/Fecha de vencimiento de pago: 21 de agosto de 2026\./);
    expect(screen.queryByTestId("quote-validity")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pago para COT-001" })).toBeInTheDocument();
    expect(screen.getByTestId("nota-detail-actions").querySelector('[aria-label="Compartir cotización COT-001"]')).not.toBeNull();
    expect(within(screen.getByTestId("document-preview")).getByRole("region", { name: "Cliente y unidad" })).toHaveTextContent("Cliente de prueba");
    expect(screen.getByTestId("nota-detail-summary")).toHaveTextContent("Referencia interna: OT-001");
    expect(screen.getByTestId("nota-detail-body")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("nota-detail-dialog")).toHaveAttribute("data-dialog-variant", "sheet");
  });

  it("renders SALE notes through the same payable actions without a WorkOrder", () => {
    const saleNote = {
      ...workOrder,
      id: "sale-note-1",
      number: "N-080526-01",
      folio: "N-080526-01",
      kind: "SALE",
      payableNoteId: "sale-note-1",
      quote: { ...workOrder.quote, title: "Venta directa", number: "COT-SALE-01" },
    } as unknown as CompletedListProps["workOrders"][number];

    render(
      <WorkOrderCompletedList
        workOrders={[saleNote]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: saleNote.id, action: vi.fn() }]}
        correctWorkOrderActions={[{ workOrderId: saleNote.id, action: vi.fn() }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Compartir cotización COT-SALE-01" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir nota de remisión N-080526-01" })).toHaveAttribute(
      "data-print-url",
      "/admin/notas/sale-note-1/print?returnTo=%2Fadmin%2Fnotas",
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(screen.getByRole("button", { name: "Registrar pago para COT-SALE-01" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Corregir nota" })).toBeInTheDocument();
  });

  it("preserves the current Notes state in the card print URL", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        noteReturnTo="/admin/notas?mode=week&anchor=2026-08-12&payment=pending&assignee=all"
      />,
    );

    expect(screen.getByRole("button", { name: "Imprimir nota de remisión COT-001" })).toHaveAttribute(
      "data-print-url",
      "/admin/notas/work-order-1/print?returnTo=%2Fadmin%2Fnotas%3Fmode%3Dweek%26anchor%3D2026-08-12%26payment%3Dpending%26assignee%3Dall",
    );
  });

  it("renders admin archive and audited revocation controls without another share button", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        archiveRevocationActions={[{
          quoteId: "quote-1",
          archive: vi.fn(),
          revoke: vi.fn().mockResolvedValue({ success: true }),
          canRevoke: true,
        }]}
      />,
    );

    expect(screen.getAllByRole("button", { name: /Compartir cotización/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de nota COT-001" }));
    expect(screen.getByRole("button", { name: "Archivar Nota COT-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revocar enlace de Nota COT-001" })).toBeInTheDocument();
  });

  it("hides revocation when the Note has no revocable public link", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        archiveRevocationActions={[{
          quoteId: "quote-1",
          archive: vi.fn(),
          revoke: vi.fn().mockResolvedValue({ success: true }),
          canRevoke: false,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Más acciones de nota COT-001" }));
    expect(screen.getByRole("button", { name: "Archivar Nota COT-001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revocar enlace de Nota COT-001" })).not.toBeInTheDocument();
  });

  it("renders payment management on fully paid notes without enabling payment registration", () => {
    const paidWorkOrder = {
      ...workOrder,
      id: "wo-paid",
      quote: {
        ...workOrder.quote,
        id: "quote-paid",
        paidCents: 12500,
        remainingCents: 0,
      },
    } as unknown as CompletedListProps["workOrders"][number];

    render(
      <WorkOrderCompletedList
        workOrders={[paidWorkOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: paidWorkOrder.id, action: vi.fn() }]}
      />,
    );

    expect(screen.queryByRole("button", { name: /registrar pago/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver pagos" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Compartir cotización/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Ver pagos" }));
    expect(screen.getByTestId("nota-detail-dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar pago/i })).not.toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente $0.00")).toHaveClass("text-[var(--color-status-success-fg)]");
  });

  it("renders a primary payment management action on every note card and removes it from overflow", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder, partialWorkOrder]} shareAction={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: "Ver pagos" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de nota COT-001" }));
    expect(screen.queryByRole("button", { name: "Ver pagos e historial" })).not.toBeInTheDocument();
  });

  it("keeps long identifiers and customers in zoom-safe bounded regions", () => {
    const longWorkOrder = {
      ...workOrder,
      id: "wo-long",
      number: "OT-2026-VERY-LONG-WORK-ORDER-IDENTIFIER-001",
      folio: "N-20260915-01-THIS-FOLIO-IS-INTENTIONALLY-LONG",
      quote: {
        ...workOrder.quote,
        number: "C-20260915-01-THIS-QUOTATION-IS-INTENTIONALLY-LONG",
        folio: "C-20260915-01-THIS-FOLIO-IS-INTENTIONALLY-LONG",
        customer: { name: "Cliente con una razón social extremadamente larga para probar el ajuste" },
      },
    } as unknown as CompletedListProps["workOrders"][number];

    render(<WorkOrderCompletedList workOrders={[longWorkOrder]} shareAction={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 3, name: "Servicio" })).toHaveClass("line-clamp-2");
    expect(screen.getByText("Cliente con una razón social extremadamente larga para probar el ajuste")).toHaveClass("truncate");
    expect(screen.getByText(/Cot\. C-20260915-01-THIS-FOLIO-IS-INTENTIONALLY-LONG/)).toBeInTheDocument();
  });
});

describe("WorkOrderCompletedList on the shared EntityCard", () => {
  it("puts Registrar pago as the state action and the tools in Imprimir · Compartir · ⋯ order", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder]} shareAction={vi.fn()} recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]} />);

    const card = screen.getByRole("group", { name: /ver vista previa de nota/i });
    expect(card.className).not.toMatch(/border/);
    expect(within(card).getByTestId("entity-card-state")).toHaveTextContent("Registrar pago");
    const tools = within(within(card).getByTestId("entity-card-tools"));
    expect(tools.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent)).toEqual([
      "Imprimir nota de remisión COT-001",
      "Compartir cotización COT-001",
      "Más acciones de nota COT-001",
    ]);
  });

  it("keeps the payment detail reachable as Ver pagos once the note is fully paid", () => {
    const paid = { ...workOrder, quote: { ...workOrder.quote, paidCents: 12_500, remainingCents: 0 } } as CompletedListProps["workOrders"][number];
    render(<WorkOrderCompletedList workOrders={[paid]} shareAction={vi.fn()} />);

    expect(within(screen.getByTestId("entity-card-state")).getByRole("button", { name: "Ver pagos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
  });
});
