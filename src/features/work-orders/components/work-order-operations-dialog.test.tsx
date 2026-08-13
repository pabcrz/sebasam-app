import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));


const actions: WorkOrderActions = {
  assign: vi.fn(() => Promise.resolve({ success: true })),
  complete: vi.fn(() => Promise.resolve({ success: true })),
};

const workers = [
  { id: "master-1", displayName: "Maestro Uno", role: "WORKER" as const, workerKind: "MASTER" as const },
  { id: "helper-1", displayName: "Ayudante Uno", role: "WORKER" as const, workerKind: "HELPER" as const },
  { id: "assistant-1", displayName: "Marco Administrativo", role: "ADMIN_ASSISTANT" as const, workerKind: null },
];

describe("WorkOrderOperationsDialog", () => {
  it("exposes the assignment dialog for an approved quote", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} actions={actions} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Asignar trabajo");
    expect(screen.getByRole("button", { name: /asignar e iniciar trabajo/i })).toBeInTheDocument();
  });

  it("shows assignment controls including special order toggle", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED", assignments: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));

    expect(screen.getByText("Asignación de personal")).toBeInTheDocument();
    expect(screen.getByText(/maestro responsable/i)).toBeInTheDocument();
    expect(screen.getByText("Ayudantes opcionales")).toBeInTheDocument();
    expect(screen.queryByText("Marco Administrativo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /asignar e iniciar trabajo/i })).toBeInTheDocument();
  });

  it("keeps assignment open when selecting a master from its portaled Select", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED", assignments: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));
    await user.click(screen.getByLabelText(/maestro responsable/i));
    expect(await screen.findByRole("option", { name: "Maestro Uno" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Maestro Uno" }));
    expect(screen.getByLabelText(/maestro responsable/i)).toHaveTextContent("Maestro Uno");
    expect(screen.queryByRole("option", { name: "Maestro Uno" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("allows completing an assigned work order", async () => {
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
        }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));

    expect(screen.getByText("Personal asignado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finalizar trabajo/i })).toBeInTheDocument();
  });

  it("shows completed status view for a finished work order", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "COMPLETED", assignments: [] }}
        workers={workers}
        actions={actions}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));

    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /asignar e iniciar trabajo/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /imprimir nota de remisión/i })).toBeInTheDocument();
  });

  it("announces and locks assignment inputs while assigning", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => new Promise<{ success: boolean }>(() => undefined));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.type(screen.getByLabelText(/nombre del responsable/i), "Externo");
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Asignando...");
    expect(screen.getByLabelText(/nombre del responsable/i)).toBeDisabled();
  });

  it("requires a reason and an explicit rollback target", async () => {
    const user = userEvent.setup();
    const rollback = vi.fn(() => Promise.resolve({ success: false, error: "Bloqueada" }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "COMPLETED" }} actions={{ rollback }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByRole("button", { name: /cancelar orden y regresar cotización/i }));
    await user.click(screen.getByRole("button", { name: /confirmar corrección/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Indica el motivo");

    await user.type(screen.getByLabelText(/motivo de la corrección/i), "Se registró por error");
    await user.click(screen.getByRole("button", { name: /confirmar corrección/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Selecciona el estado");
    await user.click(screen.getByLabelText(/regresar cotización a/i));
    await user.click(screen.getByRole("option", { name: "Borrador" }));
    await user.click(screen.getByRole("button", { name: /confirmar corrección/i }));
    expect(rollback).toHaveBeenCalledWith({ workOrderId: "wo-1", targetQuoteStatus: "DRAFT", reason: "Se registró por error" });
  });
});
