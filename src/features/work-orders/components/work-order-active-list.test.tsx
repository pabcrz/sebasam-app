import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkOrderActiveList } from "./work-order-active-list";

vi.mock("@/features/work-orders/components/work-order-operations-dialog", () => ({
  WorkOrderOperationsDialog: () => null,
}));

type ActiveListProps = ComponentProps<typeof WorkOrderActiveList>;

function renderActiveList(workOrder: ActiveListProps["workOrders"][number]) {
  render(
    <WorkOrderActiveList
      workOrders={[workOrder]}
      workers={[]}
      customers={[]}
      quoteMap={new Map()}
      saveQuoteActions={[]}
      searchCustomersAction={async () => []}
      duplicateQuoteAction={vi.fn()}
      workOrderActions={{}}
    />,
  );
}

function createWorkOrder(input: { isSpecial: boolean; assignments: Array<{ workerKind: "MASTER" | "HELPER"; displayName: string }> }) {
  return {
    id: "work-order-1",
    number: "OT-001",
    status: "ASSIGNED",
    isSpecial: input.isSpecial,
    quote: {
      id: "quote-1",
      number: "COT-001",
      customer: { name: "Cliente de prueba" },
      vehicle: null,
      totalCents: 12500,
      title: "Servicio de prueba",
    },
    assignments: input.assignments.map((assignment, index) => ({
      id: `assignment-${index}`,
      workerId: `worker-${index}`,
      status: "ACTIVE",
      worker: assignment,
    })),
  } as unknown as ActiveListProps["workOrders"][number];
}

describe("WorkOrderActiveList", () => {
  it("shows special work as plain Taller text without an assignee badge or prefix", () => {
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }));

    expect(screen.getByText("Taller")).not.toHaveClass("inline-flex");
    expect(screen.queryByText("Taller:", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("En proceso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalle de cotización COT-001" })).toBeInTheDocument();
  });

  it("shows the assigned master as plain text and retains useful helper context", () => {
    renderActiveList(
      createWorkOrder({
        isSpecial: false,
        assignments: [
          { workerKind: "MASTER", displayName: "Ana López" },
          { workerKind: "HELPER", displayName: "Luis Pérez" },
        ],
      }),
    );

    expect(screen.getByText("Ana López")).not.toHaveClass("inline-flex");
    expect(screen.queryByText("Maestro:", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("+ 1 ayudante(s)")).toBeInTheDocument();
  });
});
