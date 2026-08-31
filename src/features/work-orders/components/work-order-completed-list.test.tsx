import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkOrderCompletedList } from "./work-order-completed-list";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

type CompletedListProps = ComponentProps<typeof WorkOrderCompletedList>;

const workOrder = {
  id: "work-order-1",
  number: "OT-001",
  status: "COMPLETED",
  quote: { id: "quote-1", number: "COT-001", customer: { name: "Cliente de prueba" }, vehicle: null, totalCents: 12500, paidCents: 0, remainingCents: 12500 },
  assignments: [],
  completedAt: new Date("2026-08-14"),
  isSpecial: false,
} as unknown as CompletedListProps["workOrders"][number];

const partialWorkOrder = {
  ...workOrder,
  id: "work-order-2",
  number: "OT-002",
  quote: { ...workOrder.quote, id: "quote-2", number: "COT-002", paidCents: 5_000, remainingCents: 7_500 },
  completedAt: new Date("2026-08-10T18:00:00Z"),
} as CompletedListProps["workOrders"][number];

const urgentWorkOrder = {
  ...partialWorkOrder,
  id: "work-order-3",
  number: "OT-003",
  quote: { ...partialWorkOrder.quote, id: "quote-3", number: "COT-003" },
  completedAt: new Date("2026-07-30T18:00:00Z"),
} as CompletedListProps["workOrders"][number];

describe("WorkOrderCompletedList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T18:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("uses accessible responsive note actions and renders payment balances only when needed", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder, partialWorkOrder, urgentWorkOrder]} recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]} />);

    const print = screen.getByRole("button", { name: "Imprimir nota de remisión OT-001" });
    const payment = screen.getByRole("button", { name: "Registrar pago para COT-001" });
    expect(print).toHaveAttribute("title", "Imprimir nota de remisión OT-001");
    expect(print).toHaveClass("min-h-11", "min-w-11");
    expect(print).toHaveClass("w-10", "sm:w-auto");
    expect(print.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    expect(print.parentElement?.parentElement).toHaveClass("flex", "w-full", "flex-wrap", "items-center", "gap-3", "[&_button]:h-10", "[&_button]:w-10", "sm:gap-2", "sm:[&_button]:h-9", "sm:[&_button]:w-auto");
    expect(payment).toHaveAttribute("title", "Registrar pago para COT-001");
    expect(payment).toHaveClass("w-10", "sm:w-auto");
    expect(screen.getByText("Sin pago", { exact: true })).toBeVisible();
    expect(screen.queryByText(/Sin pago · Saldo/)).not.toBeInTheDocument();
    expect(screen.getByText(/Pago parcial · Saldo.*75/)).toBeVisible();
    expect(screen.getByText(/Cobro urgente · Saldo.*75/)).toBeVisible();
    expect(screen.queryByText("Completada")).not.toBeInTheDocument();
  });

  it("opens completed-note printing on the note route and never the quote route", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WorkOrderCompletedList workOrders={[workOrder]} />);

    screen.getByRole("button", { name: "Imprimir nota de remisión OT-001" }).click();

    expect(open).toHaveBeenCalledWith("/admin/notas/work-order-1/print?returnTo=/admin/notas", "_blank");
    expect(open.mock.calls[0]?.[0]).not.toContain("/admin/quotes/");
    open.mockRestore();
  });
});
