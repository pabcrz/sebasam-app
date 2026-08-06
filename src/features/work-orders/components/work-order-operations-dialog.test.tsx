import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";

const actions: WorkOrderActions = {
  ensureWaiting: vi.fn(() => Promise.resolve({ success: true })),
  assign: vi.fn(() => Promise.resolve({ success: true })),
  start: vi.fn(() => Promise.resolve({ success: true })),
  recordExecution: vi.fn(() => Promise.resolve({ success: true })),
  removeExecution: vi.fn(() => Promise.resolve({ success: true })),
};

const workers = [
  { id: "master-1", displayName: "Maestro Uno", workerKind: "MASTER" as const },
  { id: "helper-1", displayName: "Ayudante Uno", workerKind: "HELPER" as const },
];

describe("WorkOrderOperationsDialog", () => {
  it("exposes the waiting entry point only for an approved quote", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} actions={actions} />);

    await user.click(screen.getByRole("button", { name: /enviar cotización c-001 a espera/i }));

    expect(screen.getByRole("dialog")).toHaveTextContent("En espera");
    expect(screen.getByRole("button", { name: "Crear orden en espera" })).toBeInTheDocument();
  });

  it("shows assignment controls for a waiting work order", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED", assignments: [], executionRecords: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));

    expect(screen.getByText("Asignación")).toBeInTheDocument();
    expect(screen.getByText("Maestro requerido")).toBeInTheDocument();
    expect(screen.getByText("Ayudantes opcionales")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asignar personal" })).toBeInTheDocument();
  });

  it("does not expose operational actions for a terminal work order", () => {
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "CANCELLED", assignments: [], executionRecords: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    expect(screen.queryByRole("button", { name: /gestionar orden de trabajo/i })).not.toBeInTheDocument();
  });
});
