import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    sections: [],
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
    expect(print).toHaveAttribute("data-print-url", "/admin/notas/work-order-1/print?returnTo=%2Fadmin%2Fnotas");
    expect(screen.getAllByRole("button", { name: /Compartir cotización/ })).toHaveLength(4);
    expect(screen.queryByText("Historial de pagos")).not.toBeInTheDocument();
    expect(screen.queryByTestId("nota-payment-history")).not.toBeInTheDocument();
    expect(screen.queryByText("payment-1")).not.toBeInTheDocument();
    expect(screen.getAllByText("Pendiente", { exact: true })).toHaveLength(3);
    expect(screen.getByText("Vencida", { exact: true })).toBeVisible();
    expect(screen.queryByText(/Pendiente · Saldo/)).not.toBeInTheDocument();
    expect(screen.queryByText("Completada")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("card-header")[0]?.querySelector("[class*='min-w-0']")).toBeInTheDocument();
    expect(screen.getAllByTestId("card-dates")[0]?.firstElementChild).toHaveClass("flex-wrap");
    expect(screen.getAllByTestId("operational-card-secondary-actions")[0]).toHaveClass("gap-1");
    expect(screen.getAllByTestId("card-header")[0]?.parentElement?.parentElement?.parentElement).toHaveClass("!p-2");
  });

  it("does not render administrative payment actions in the historical payment row", () => {
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

    expect(screen.queryByRole("button", { name: "Más acciones de nota COT-001" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de nota COT-001" }));
    expect(screen.queryByRole("button", { name: /corregir pago/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revertir pago/i })).not.toBeInTheDocument();
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
    expect(screen.getByTestId("card-context")).toHaveTextContent("Cot. C-140826-01");
    expect(screen.getAllByText(/Cot\.\s*C-140826-01/)).toHaveLength(1);
    expect(screen.getByTestId("card-header")).toHaveTextContent("N-140826-01");
    expect(screen.getByTestId("card-header")).not.toHaveTextContent("C-140826-01");
    expect(screen.getByTestId("card-header")).not.toHaveTextContent("T-0926-01");
    expect(screen.getByTestId("card-header").querySelector("p")).toHaveClass("text-2xl", "tabular-nums", "whitespace-nowrap");
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de nota N-140826-01" }));
    expect(screen.getByTestId("nota-detail-summary")).toHaveTextContent("Referencia interna: T-0926-01");
  });

  it("renders sharing for completed Notes", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder]} shareAction={vi.fn()} />);

    const share = screen.getByRole("button", { name: /Compartir cotización/ });
    expect(share).toHaveAttribute("aria-label", "Compartir cotización COT-001");
    expect(share).toHaveAttribute("title", "Compartir cotización COT-001");
    expect(share).not.toHaveTextContent("Compartir");
  });

  it("keeps payment registration out of the card while retaining it in detail", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Registrar pago para COT-001" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de nota COT-001" }));
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

  it("opens detail from the summary, but action clicks do not open it", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
        paymentHistories={[{ workOrderId: workOrder.id, totalCents: 12_500, payments: longPaymentHistory }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Compartir cotización/ }));
    expect(screen.queryByTestId("nota-detail-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de nota COT-001" }));
    expect(screen.getByTestId("nota-detail-dialog")).toBeInTheDocument();
    expect(screen.getByText("Historial de pagos")).toBeInTheDocument();
    expect(screen.getByTestId("nota-payment-history")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(longPaymentHistory.length);
    expect(screen.getByTestId("quote-payment-balance-indicator")).toHaveTextContent(/Saldo pendiente\s*\$125\.00/);
    expect(screen.getByTestId("note-due-date")).toHaveTextContent(/Fecha de vencimiento de pago: 21 de agosto de 2026\./);
    expect(screen.queryByTestId("quote-validity")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pago para COT-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Imprimir nota de remisión COT-001/ })).toBeInTheDocument();
    expect(screen.getByTestId("nota-detail-actions").querySelector('[aria-label="Compartir cotización COT-001"]')).not.toBeNull();
    expect(screen.getByTestId("nota-detail-summary")).toHaveTextContent("Cliente de prueba");
    expect(screen.getByTestId("nota-detail-summary")).toHaveTextContent("Referencia interna: OT-001");
    expect(screen.getByTestId("nota-detail-body")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("nota-detail-body")).toHaveClass("p-0");
    expect(screen.getByTestId("nota-detail-body")).not.toHaveClass("px-4", "py-4", "sm:px-6", "sm:py-6");
    expect(screen.getByTestId("nota-detail-dialog")).toHaveClass("h-dvh", "w-screen", "sm:max-w-6xl");
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
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de nota N-080526-01" }));
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

  it("renders Compartir as single primary CTA when note is fully paid", () => {
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
    expect(screen.getByRole("button", { name: /Compartir cotización/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Compartir cotización/ })).toHaveLength(1);
    const context = screen.getByTestId("card-context");
    expect(context).not.toHaveTextContent("Total");
    expect(context.querySelector("[class*='status-success-fg']")).toHaveTextContent("Saldo pendiente $0.00");
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

    expect(screen.getByTestId("card-header").firstElementChild).toHaveClass("min-w-0");
    expect(screen.getByTestId("card-header").querySelector("p")).toHaveClass(
      "w-full",
      "text-2xl",
      "tabular-nums",
      "whitespace-nowrap",
    );
    expect(screen.getByTestId("card-identity").querySelector("p")).toHaveClass("truncate");
    expect(screen.getByTestId("card-context")).toHaveTextContent("Cot. C-20260915-01-THIS-FOLIO-IS-INTENTIONALLY-LONG");
  });
});
