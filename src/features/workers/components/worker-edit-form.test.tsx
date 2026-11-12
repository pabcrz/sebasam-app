import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkerEditForm } from "./worker-edit-form";

describe("WorkerEditForm", () => {
  it("groups the worker fields under a semantic section label without changing their labels", () => {
    render(
      <WorkerEditForm
        action={vi.fn()}
        worker={{
          displayName: "Ana Maestra",
          username: "ana.maestra",
          email: "ana.maestra@sebasam.internal",
          workerKind: "MASTER",
        }}
      />,
    );

    expect(screen.getByText("Perfil operativo").tagName).toBe("LEGEND");
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("name", "displayName");
    expect(screen.getByLabelText("Usuario interno")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Correo interno")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tipo de trabajador" })).toBeInTheDocument();
  });

  it("can leave submission to a footer outside the form, linked by its id", () => {
    render(
      <WorkerEditForm
        action={vi.fn()}
        formId="worker-edit-form-1"
        showSubmit={false}
        worker={{ displayName: "Ana", username: "ana", email: "ana@sebasam.local", workerKind: "MASTER" }}
      />,
    );

    expect(screen.getByTestId("worker-edit-form")).toHaveAttribute("id", "worker-edit-form-1");
    expect(screen.queryByRole("button", { name: "Guardar trabajador" })).not.toBeInTheDocument();
  });
});
