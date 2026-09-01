import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkerCardList } from "./worker-card-list";

describe("WorkerCardList", () => {
  it("shows classification and status, then opens editing in a modal", async () => {
    const user = userEvent.setup();

    render(
      <WorkerCardList
        workers={[
          {
            id: "worker-1",
            displayName: "Ana López",
            username: "ana.lopez",
            email: "ana.lopez@sebasam.local",
            workerKind: "MASTER",
            isActive: false,
          },
        ]}
        updateAction={vi.fn()}
        setActiveAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Maestro")).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();

    const edit = screen.getByRole("button", { name: "Editar" });
    expect(edit.parentElement).not.toHaveClass("min-w-0", "flex-1");

    await user.click(edit);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("worker-edit-form")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo interno")).toHaveValue("ana.lopez@sebasam.local");
    expect(screen.getByLabelText("Correo interno")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Activar trabajador" })).toBeInTheDocument();
    expect(screen.getByText("Desactivar conserva sus asignaciones y registros históricos.")).toBeInTheDocument();
  });

  it("offers deactivation for active workers inside the edit modal", async () => {
    const user = userEvent.setup();

    render(
      <WorkerCardList
        workers={[
          {
            id: "worker-1",
            displayName: "Ana López",
            username: "ana.lopez",
            email: "ana.lopez@sebasam.local",
            workerKind: "MASTER",
            isActive: true,
          },
        ]}
        updateAction={vi.fn()}
        setActiveAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("button", { name: "Desactivar trabajador" })).toBeInTheDocument();
  });
});
