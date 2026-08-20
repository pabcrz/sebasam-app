import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { WorkOrderActiveList } from "./work-order-active-list";

vi.mock("@/features/work-orders/components/work-order-operations-dialog", () => ({
  WorkOrderOperationsDialog: () => null,
}));

type ActiveListProps = ComponentProps<typeof WorkOrderActiveList>;

function renderActiveList(workOrder: ActiveListProps["workOrders"][number], input: { duplicateQuoteAction?: ActiveListProps["duplicateQuoteAction"] } = {}) {
  render(
    <WorkOrderActiveList
      workOrders={[workOrder]}
      workers={[]}
      customers={[]}
      quoteMap={new Map()}
      saveQuoteActions={[]}
      searchCustomersAction={async () => []}
      duplicateQuoteAction={input.duplicateQuoteAction ?? vi.fn()}
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

  it("triggers toast error feedback when duplication fails", async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, "error");
    const duplicateQuoteAction = vi.fn().mockRejectedValue(new Error("offline"));
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }), { duplicateQuoteAction });

    await user.click(screen.getByRole("button", { name: "Duplicar cotización" }));

    expect(toastError).toHaveBeenCalledWith(
      "No se pudo duplicar la cotización. Intenta de nuevo.",
      { id: "quote-duplicate-error" }
    );
  });

  it("uses accessible responsive action controls", () => {
    renderActiveList(createWorkOrder({ isSpecial: true, assignments: [] }));

    const duplicate = screen.getByRole("button", { name: "Duplicar cotización" });
    expect(duplicate).toHaveAttribute("title", "Duplicar cotización");
    expect(duplicate.parentElement).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto");
    expect(duplicate.parentElement?.parentElement).toHaveClass("flex", "w-full", "flex-wrap", "items-center", "gap-3", "[&_button]:h-10", "[&_button]:w-10", "sm:gap-2", "sm:[&_button]:h-9", "sm:[&_button]:w-auto");
  });
});
