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
});
