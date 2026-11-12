import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkOrderOperationsDialog, type WorkOrderActions } from "./work-order-operations-dialog";

const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
    push,
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
  beforeEach(() => {
    refresh.mockReset();
    push.mockReset();
  });

  it("exposes the assignment dialog for an approved quote", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} actions={actions} triggerVariant="primary" />);

    const trigger = screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i });
    expect(trigger).toHaveClass("bg-[var(--color-btn-primary)]");
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toHaveTextContent("C-001 · Sin cliente");
    expect(screen.getByRole("button", { name: /asignar e iniciar trabajo/i })).toBeInTheDocument();
  });

  it("can keep an unsupported-status flow trigger visible but disabled without opening the dialog", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="REJECTED"
        workOrder={null}
        alwaysRenderTrigger
        triggerDisabled
        triggerFlowLabel="Asignar trabajo"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Asignar trabajo para cotización C-001" });
    expect(trigger).toBeVisible();
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses persisted SALE intent without an operation selector or master assignment", async () => {
    const user = userEvent.setup();
    const convert = vi.fn(() => Promise.resolve({ success: true }));
    render(
      <WorkOrderOperationsDialog
        quoteId="quote-sale"
        quoteOperation="SALE"
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={null}
        workers={workers}
        actions={{ convert }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i }));

    expect(screen.queryByLabelText(/operación de conversión/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/maestro responsable/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear nota de venta/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /crear nota de venta/i }));

    await waitFor(() => expect(convert).toHaveBeenCalledWith({ quoteId: "quote-sale", operation: "SALE" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/notas"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("uses persisted SALE intent as the fixed conversion operation", async () => {
    const user = userEvent.setup();
    const convert = vi.fn(() => Promise.resolve({ success: true }));
    render(<WorkOrderOperationsDialog quoteId="quote-sale" quoteOperation="SALE" quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} actions={{ convert }} />);

    await user.click(screen.getByRole("button", { name: /crear nota de venta para cotización c-001/i }));

    expect(screen.queryByLabelText(/operación de conversión/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear nota de venta/i })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("no crea una orden de trabajo");
    expect(screen.queryByText("Asignación de personal")).not.toBeInTheDocument();
  });

  it.each(["DRAFT", "SENT"] as const)("exposes internal work-order management for a %s quote", async (quoteStatus) => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus={quoteStatus} workOrder={null} actions={actions} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));

    expect(screen.getByRole("button", { name: /asignar e iniciar trabajo/i })).toBeInTheDocument();
  });

  it("defaults DRAFT acceptance to yes and allows opting into the exception path", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => Promise.resolve({ success: true }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="DRAFT" workOrder={null} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));
    expect(screen.getByRole("button", { name: "Sí, aceptó" })).toHaveClass("bg-[var(--color-btn-primary)]");
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith({ isSpecial: true, customerAccepted: true, acceptanceReason: "" }));

    await user.click(screen.getByRole("button", { name: "No, fue una excepción" }));
    await user.type(screen.getByLabelText(/motivo de aceptación excepcional/i), "Aceptación verbal");
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));
    await waitFor(() => expect(assign).toHaveBeenLastCalledWith({ isSpecial: true, customerAccepted: false, acceptanceReason: "Aceptación verbal" }));
  });

  it.each(["DRAFT", "SENT"] as const)("submits affirmative acceptance by default for %s WORK assignment", async (quoteStatus) => {
    const user = userEvent.setup();
    const assign = vi.fn(() => Promise.resolve({ success: true }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus={quoteStatus} workOrder={null} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith({ isSpecial: true, customerAccepted: true, acceptanceReason: "" }));
  });

  it("assigns an APPROVED quote directly without showing an acceptance question", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => Promise.resolve({ success: true }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));
    expect(screen.queryByText("¿El cliente aceptó la cotización?")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith({ isSpecial: true }));
  });

  it("keeps the acceptance question and resets to affirmative when reopening DRAFT WORK", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="DRAFT" workOrder={null} actions={actions} />);

    const trigger = screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "No, fue una excepción" }));
    await user.click(screen.getByRole("button", { name: "Cerrar diálogo de orden de trabajo" }));
    await user.click(trigger);

    expect(screen.getByRole("button", { name: "Sí, aceptó" })).toHaveClass("bg-[var(--color-btn-primary)]");
  });

  it("keeps server validation feedback visible and leaves the draft dialog actionable", async () => {
    const user = userEvent.setup();
    const assign = vi.fn().mockResolvedValue({ success: false, error: "Selecciona un cliente o identifica la unidad." });
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="DRAFT" workOrder={null} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: "Sí, aceptó" }));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Selecciona un cliente o identifica la unidad.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each(["DRAFT", "SENT", "APPROVED"] as const)("exposes rollback for a %s work order", async (quoteStatus) => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus={quoteStatus} workOrder={{ id: "wo-1", number: "T-001", status: "ASSIGNED" }} actions={actions} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));

    expect(screen.getByRole("button", { name: "Cancelar orden" })).toBeInTheDocument();
  });

  it("keeps work actions icon-only on mobile and labeled on desktop", async () => {
    const user = userEvent.setup();
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "COMPLETED" }}
        actions={{}}
        triggerIconOnlyMobile
      />,
    );

    const viewOrder = screen.getByRole("button", { name: "Gestionar orden de trabajo T-001" });
    expect(viewOrder).toHaveAttribute("title", "Gestionar orden de trabajo T-001");
    expect(viewOrder).toHaveClass("h-10", "w-10", "sm:h-9", "sm:w-auto");
    expect(viewOrder.querySelector("span")).toHaveClass("sr-only", "sm:not-sr-only");
    expect(viewOrder).toHaveTextContent("Gestionar orden");

    await user.click(viewOrder);
    expect(screen.queryByRole("button", { name: "Imprimir nota de remisión T-001" })).not.toBeInTheDocument();
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

  it("assigns special work to Taller with only the special-work toggle", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => Promise.resolve({ success: true }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));

    expect(screen.queryByLabelText(/nombre del responsable/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith({ isSpecial: true }));
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

  it("keeps the assigned work-order dialog open when reassigning a master from its portaled Select", async () => {
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
    await user.click(screen.getByRole("button", { name: /cambiar maestro o asignación/i }));
    await user.click(screen.getByLabelText(/maestro responsable/i));
    expect(await screen.findByRole("option", { name: "Maestro Uno" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Maestro Uno" }));
    expect(screen.getByLabelText(/maestro responsable/i)).toHaveTextContent("Maestro Uno");
    expect(screen.queryByRole("option", { name: "Maestro Uno" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("reassigns special work to Taller with only the special-work toggle", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => Promise.resolve({ success: true }));
    render(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "ASSIGNED", assignments: [{ id: "assignment-1", workerId: "master-1", status: "ASSIGNED", worker: workers[0] }] }}
        workers={workers}
        actions={{ assign }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByRole("button", { name: /cambiar maestro o asignación/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));

    expect(screen.queryByLabelText(/nombre del responsable/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar reasignación/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith({ isSpecial: true }));
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
    expect(screen.queryByRole("button", { name: /imprimir nota de remisión/i })).not.toBeInTheDocument();
  });

  it("locks the assignment form and trigger while an assignment is pending", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => new Promise<{ success: boolean }>(() => undefined));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Asignando...");
    expect(document.querySelector(".tabler-icon-user-check")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/trabajo especial/i)).toBeDisabled();
    expect(document.querySelector('button[aria-label="Asignando trabajo..."]')).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /asignando/i }));
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("closes with the accessible X and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={actions} />);

    const trigger = screen.getByRole("button", { name: /gestionar orden de trabajo/i });
    await user.click(trigger);

    await user.click(screen.getByRole("button", { name: /cerrar diálogo de orden de trabajo/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("closes with Escape or the backdrop when no assignment is pending", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={actions} />);

    const trigger = screen.getByRole("button", { name: /gestionar orden de trabajo/i });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toBeTruthy();
    await user.click(overlay!);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("rejects Escape and overlay dismissal while an assignment is pending", async () => {
    const user = userEvent.setup();
    const assign = vi.fn(() => new Promise<{ success: boolean }>(() => undefined));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    expect(screen.getByRole("button", { name: /cerrar diálogo de orden de trabajo/i })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toBeTruthy();
    await user.click(overlay!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("restores assignment controls and permits retry after a failed assignment", async () => {
    const user = userEvent.setup();
    const assign = vi.fn()
      .mockResolvedValueOnce({ success: false, error: "No disponible" })
      .mockResolvedValueOnce({ success: false, error: "No disponible" });
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No disponible");
    await waitFor(() => expect(screen.getByLabelText(/trabajo especial/i)).toBeEnabled());
    expect(document.querySelector('button[aria-label="Gestionar orden de trabajo T-001"]')).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it("restores assignment controls after a thrown assignment error", async () => {
    const user = userEvent.setup();
    const assign = vi.fn().mockRejectedValueOnce(new Error("Network error"));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={{ assign }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la acción");
    await waitFor(() => expect(screen.getByLabelText(/trabajo especial/i)).toBeEnabled());
  });

  it("refreshes once and renders the updated work-order management state after assignment", async () => {
    const user = userEvent.setup();
    const assign = vi.fn().mockResolvedValue({ success: true });
    const { rerender } = render(
      <WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "PLANNED" }} actions={{ assign }} />,
    );

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByLabelText(/trabajo especial/i));
    await user.click(screen.getByRole("button", { name: /asignar e iniciar trabajo/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    rerender(
      <WorkOrderOperationsDialog
        quoteNumber="C-001"
        quoteStatus="APPROVED"
        workOrder={{ id: "wo-1", number: "T-001", status: "ASSIGNED", assignments: [] }}
        actions={{ assign }}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("Personal asignado");
    expect(screen.queryByRole("button", { name: /asignar e iniciar trabajo/i })).not.toBeInTheDocument();
  });

  it("requires a reason and an explicit rollback target", async () => {
    const user = userEvent.setup();
    const rollback = vi.fn(() => Promise.resolve({ success: false, error: "Bloqueada" }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={{ id: "wo-1", number: "T-001", status: "COMPLETED" }} actions={{ rollback }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo/i }));
    await user.click(screen.getByRole("button", { name: "Cancelar orden" }));
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

describe("WorkOrderOperationsDialog as the Gestionar sheet", () => {
  const assignedWorkOrder = {
    id: "wo-1",
    number: "T-001",
    status: "ASSIGNED" as const,
    assignments: [{ id: "assignment-1", workerId: "master-1", status: "ASSIGNED", worker: workers[0] }],
  };

  it("opens as a sheet with the one primary action in the fixed footer and cancellation at the end of the body", async () => {
    const user = userEvent.setup();
    const rollback = vi.fn(() => Promise.resolve({ success: true }));
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={assignedWorkOrder} workers={workers} actions={{ ...actions, rollback }} />);

    await user.click(screen.getByRole("button", { name: /gestionar orden de trabajo t-001/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-dialog-variant", "sheet");
    const footer = dialog.querySelector<HTMLElement>("[data-dialog-footer]");
    expect(footer).not.toBeNull();
    expect(within(footer!).getByRole("button", { name: /finalizar trabajo/i })).toBeInTheDocument();
    expect(within(footer!).queryByRole("button", { name: /cancelar orden/i })).not.toBeInTheDocument();

    const dangerZone = dialog.querySelector<HTMLElement>("[data-dialog-danger-zone]");
    expect(dangerZone).not.toBeNull();
    expect(within(dangerZone!).getByRole("button", { name: "Cancelar orden" })).toHaveClass("border-[var(--color-status-danger-border)]");
    expect(within(dangerZone!).queryByRole("button", { name: /finalizar trabajo/i })).not.toBeInTheDocument();
  });

  it("puts the assignment submit in the footer for an unassigned work and keeps ✕ in the header", async () => {
    const user = userEvent.setup();
    render(<WorkOrderOperationsDialog quoteNumber="C-001" quoteStatus="APPROVED" workOrder={null} workers={workers} actions={actions} />);

    await user.click(screen.getByRole("button", { name: /gestionar trabajo de cotización c-001/i }));

    const dialog = screen.getByRole("dialog");
    const footer = dialog.querySelector<HTMLElement>("[data-dialog-footer]");
    expect(within(footer!).getByRole("button", { name: /asignar e iniciar trabajo/i })).toBeInTheDocument();
    const header = dialog.querySelector<HTMLElement>("[data-dialog-header]");
    expect(within(header!).getByRole("button", { name: "Cerrar diálogo de orden de trabajo" })).toBeInTheDocument();
  });
});
