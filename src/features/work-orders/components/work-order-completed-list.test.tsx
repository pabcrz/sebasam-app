import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkOrderCompletedList } from "./work-order-completed-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/quotes/components/share-quote-button", () => ({
  ShareQuoteButton: () => <button type="button">Compartir cotización</button>,
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

describe("WorkOrderCompletedList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T18:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("renders note printing on each completed card and payment balances only when needed", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder, partialWorkOrder, overdueWorkOrder, noDueDateWorkOrder]}
        shareAction={vi.fn()}
        recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
      />,
    );

    const payment = screen.getByRole("button", { name: "Registrar pago para COT-001" });
    const print = screen.getByRole("button", { name: "Imprimir nota de remisión OT-001" });
    expect(print).toHaveAttribute("title", "Imprimir nota de remisión OT-001");
    expect(print).toHaveAttribute("data-print-url", "/admin/notas/work-order-1/print?returnTo=%2Fadmin%2Fnotas");
    expect(payment).toHaveAttribute("title", "Registrar pago para COT-001");
    expect(payment).toHaveClass("w-10", "sm:w-auto");
    expect(screen.getByText("Sin pago", { exact: true })).toBeVisible();
    expect(screen.queryByText(/Sin pago · Saldo/)).not.toBeInTheDocument();
    expect(screen.getByText(/Pago parcial · Saldo.*75/)).toBeVisible();
    expect(screen.getByText(/Vencida · Saldo.*75/)).toBeVisible();
    expect(screen.getByText("Sin fecha de vencimiento", { exact: true })).toBeVisible();
    expect(screen.queryByText("Completada")).not.toBeInTheDocument();
  });

  it("renders a correction trigger for the active payment when an admin action is provided", () => {
    const correctableWorkOrder = {
      ...workOrder,
      quote: { ...workOrder.quote, activePaymentId: "pay-1", activePaymentMethod: "CASH", activePaymentAmountCents: 12_500 },
    } as unknown as CompletedListProps["workOrders"][number];

    render(
      <WorkOrderCompletedList
        workOrders={[correctableWorkOrder]}
        shareAction={vi.fn()}
        correctionActions={[{ workOrderId: correctableWorkOrder.id, action: vi.fn() }]}
      />,
    );

    expect(screen.getByRole("button", { name: /corregir pago de \$125\.00/i })).toBeInTheDocument();
  });

  it("renders Corregir nota trigger when admin action is provided", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        correctWorkOrderActions={[{ workOrderId: workOrder.id, action: vi.fn() }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Corregir nota" })).toBeInTheDocument();
  });

  it("renders N folio as primary document identifier, OT as secondary, and antecedent quote C folio", () => {
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
    expect(screen.getByText("(T-0926-01)")).toBeInTheDocument();
    expect(screen.getByText(/Cot\.\s*C-140826-01/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir nota de remisión T-0926-01" })).toHaveAttribute(
      "data-print-url",
      "/admin/notas/wo-daily/print?returnTo=%2Fadmin%2Fnotas",
    );
  });

  it("renders sharing for completed Notes", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder]} shareAction={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Compartir cotización" })).toBeInTheDocument();
  });

  it("preserves the current Notes state in the card print URL", () => {
    render(
      <WorkOrderCompletedList
        workOrders={[workOrder]}
        shareAction={vi.fn()}
        noteReturnTo="/admin/notas?mode=week&anchor=2026-08-12&payment=pending&assignee=all"
      />,
    );

    expect(screen.getByRole("button", { name: "Imprimir nota de remisión OT-001" })).toHaveAttribute(
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

    expect(screen.getByRole("button", { name: "Compartir cotización" })).toBeInTheDocument();
    const archive = screen.getByRole("button", { name: "Archivar Nota COT-001" });
    const revoke = screen.getByRole("button", { name: "Revocar enlace de Nota COT-001" });
    expect(archive.parentElement).not.toBe(revoke.parentElement);
    expect(archive.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    expect(revoke.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    expect(screen.getAllByRole("button", { name: "Compartir cotización" })).toHaveLength(1);
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

    expect(screen.getByRole("button", { name: "Archivar Nota COT-001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revocar enlace de Nota COT-001" })).not.toBeInTheDocument();
  });
});
