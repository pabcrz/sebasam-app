import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
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

describe("WorkOrderCompletedList", () => {
  it("uses accessible responsive note actions", () => {
    render(<WorkOrderCompletedList workOrders={[workOrder]} recordPaymentActions={[{ workOrderId: workOrder.id, action: vi.fn() }]} />);

    const print = screen.getByRole("button", { name: "Imprimir nota de remisión OT-001" });
    const payment = screen.getByRole("button", { name: "Registrar pago para COT-001" });
    expect(print).toHaveAttribute("title", "Imprimir nota de remisión OT-001");
    expect(print).toHaveClass("w-10", "sm:w-auto");
    expect(print.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    expect(print.parentElement?.parentElement).toHaveClass("flex", "w-full", "flex-wrap", "items-center", "gap-3", "[&_button]:h-10", "[&_button]:w-10", "sm:gap-2", "sm:[&_button]:h-9", "sm:[&_button]:w-auto");
    expect(payment).toHaveAttribute("title", "Registrar pago para COT-001");
    expect(payment).toHaveClass("w-10", "sm:w-auto");
  });
});
