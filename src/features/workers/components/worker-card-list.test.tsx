import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkerCardList } from "./worker-card-list";

const ana = {
  id: "worker-1",
  displayName: "Ana López",
  username: "ana.lopez",
  email: "ana.lopez@sebasam.local",
  workerKind: "MASTER" as const,
  isActive: true,
  _count: { assignments: 1 },
};

const luis = {
  id: "worker-2",
  displayName: "Luis Pérez",
  username: "luis.perez",
  email: "luis.perez@sebasam.local",
  workerKind: "HELPER" as const,
  isActive: false,
  _count: { assignments: 0 },
};

function renderList(props: Partial<React.ComponentProps<typeof WorkerCardList>> = {}) {
  return render(
    <WorkerCardList
      workers={[ana, luis]}
      updateAction={vi.fn()}
      setActiveAction={vi.fn()}
      {...props}
    />,
  );
}

function openSheet(name: string) {
  return screen.getByRole("button", { name: `Editar a ${name}` });
}

describe("WorkerCardList", () => {
  it("shows role and active-job workload in each row and marks only inactive workers", () => {
    renderList();

    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Maestro · @ana.lopez")).toBeInTheDocument();
    expect(screen.getByText("1 trabajo activo")).toBeInTheDocument();
    expect(screen.getByText("Ayudante · @luis.perez")).toBeInTheDocument();
    expect(screen.getByText("Sin trabajos")).toBeInTheDocument();
    expect(screen.getAllByText("Inactivo")).toHaveLength(1);
    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("opens the edit sheet from the whole row", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(openSheet("Ana López"));

    const sheet = screen.getByRole("dialog", { name: "Editar trabajador" });
    expect(sheet).toHaveAttribute("data-dialog-variant", "sheet");
    expect(within(sheet).getByTestId("worker-edit-form")).toBeInTheDocument();
    expect(within(sheet).getByLabelText("Correo interno")).toHaveValue("ana.lopez@sebasam.local");
  });

  it("keeps Cancelar left and Guardar right in the fixed footer", async () => {
    const user = userEvent.setup();
    renderList({ deleteAction: vi.fn() });

    await user.click(openSheet("Ana López"));

    const sheet = screen.getByRole("dialog", { name: "Editar trabajador" });
    const footer = sheet.querySelector("[data-dialog-footer]") as HTMLElement;
    expect(within(footer).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Cancelar",
      "Guardar",
    ]);
  });

  it("puts Desactivar and Eliminar as outlined danger buttons in the danger zone, never beside Guardar", async () => {
    const user = userEvent.setup();
    renderList({ deleteAction: vi.fn() });

    await user.click(openSheet("Ana López"));

    const sheet = screen.getByRole("dialog", { name: "Editar trabajador" });
    const zone = sheet.querySelector("[data-dialog-danger-zone]") as HTMLElement;
    const deactivate = within(zone).getByRole("button", { name: "Desactivar trabajador" });
    const remove = within(zone).getByRole("button", { name: "Eliminar trabajador" });

    expect(deactivate).toHaveClass("bg-transparent", "border-[var(--color-status-danger-border)]");
    expect(remove).toHaveClass("bg-transparent", "border-[var(--color-status-danger-border)]");
    const footer = sheet.querySelector("[data-dialog-footer]") as HTMLElement;
    expect(within(footer).queryByRole("button", { name: /eliminar|desactivar/i })).not.toBeInTheDocument();
  });

  it("keeps deletion behind a two-step confirmation inside the danger zone", async () => {
    const user = userEvent.setup();
    renderList({ deleteAction: vi.fn() });

    await user.click(openSheet("Ana López"));
    const zone = screen.getByRole("dialog").querySelector("[data-dialog-danger-zone]") as HTMLElement;

    await user.click(within(zone).getByRole("button", { name: "Eliminar trabajador" }));

    expect(within(zone).getByRole("button", { name: "Sí, eliminar definitivamente" })).toBeInTheDocument();
    expect(within(zone).getByRole("button", { name: "No, conservar" })).toBeInTheDocument();
  });

  it("offers activation for inactive workers outside the danger zone", async () => {
    const user = userEvent.setup();
    renderList({ deleteAction: vi.fn() });

    await user.click(openSheet("Luis Pérez"));

    const sheet = screen.getByRole("dialog", { name: "Editar trabajador" });
    const zone = sheet.querySelector("[data-dialog-danger-zone]") as HTMLElement;
    expect(within(sheet).getByRole("button", { name: "Activar trabajador" })).toBeInTheDocument();
    expect(within(zone).queryByRole("button", { name: "Activar trabajador" })).not.toBeInTheDocument();
    expect(within(zone).queryByRole("button", { name: "Desactivar trabajador" })).not.toBeInTheDocument();
  });

  it("offers deactivation for active workers inside the edit sheet", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(openSheet("Ana López"));

    expect(screen.getByRole("button", { name: "Desactivar trabajador" })).toBeInTheDocument();
    expect(
      screen.getByText("Desactivar conserva sus asignaciones y registros históricos."),
    ).toBeInTheDocument();
  });
});
