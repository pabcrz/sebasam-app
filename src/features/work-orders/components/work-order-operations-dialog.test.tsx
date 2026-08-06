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
  { id: "master-1", displayName: "Maestro Uno", role: "WORKER" as const, workerKind: "MASTER" as const },
  { id: "helper-1", displayName: "Ayudante Uno", role: "WORKER" as const, workerKind: "HELPER" as const },
  { id: "assistant-1", displayName: "Marco Administrativo", role: "ADMIN_ASSISTANT" as const, workerKind: null },
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
    expect(screen.queryByText("Marco Administrativo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Asignar personal" })).toBeInTheDocument();
  });

  it("starts assigned work without repeating the assignment confirmations", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{
          id: "wo-1",
          number: "T-001",
          status: "ASSIGNED",
          assignments: [{ id: "assignment-1", workerId: "master-1", status: "ASSIGNED", worker: workers[0] }],
          executionRecords: [],
        }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));

    expect(screen.getByText("Capacidad y disponibilidad confirmadas durante la asignación.")).toBeInTheDocument();
    expect(screen.queryByText("Confirma que hay espacio disponible en el taller")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar trabajo" })).toBeInTheDocument();
  });

  it("shows the timeline and ten-step progress controls during execution", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "IN_PROGRESS", assignments: [], executionRecords: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));

    expect(screen.getByRole("list", { name: "Etapas de la orden de trabajo" })).toHaveTextContent("En espera");
    expect(screen.getByRole("list", { name: "Etapas de la orden de trabajo" })).toHaveTextContent("Asignada");
    expect(screen.getByRole("list", { name: "Etapas de la orden de trabajo" })).toHaveTextContent("En proceso");
    expect(screen.getByRole("slider", { name: "Avance en incrementos de diez" })).toHaveAttribute("step", "10");
    expect(screen.getByLabelText("Detalle (opcional)")).toBeInTheDocument();
    expect(screen.queryByText("Resumen")).not.toBeInTheDocument();
    expect(screen.queryByText("Notas y detalles")).not.toBeInTheDocument();
  });

  it("keeps terminal state visible without exposing operational actions", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "CANCELLED", assignments: [], executionRecords: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));

    expect(screen.getByText("Estado terminal: Cancelada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asignar personal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar trabajo" })).not.toBeInTheDocument();
  });
});
