import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkerCreateDialog } from "./worker-create-dialog";

describe("WorkerCreateDialog", () => {
  it("opens with initial focus and restores focus after Escape or backdrop dismissal", async () => {
    const user = userEvent.setup();
    render(<WorkerCreateDialog action={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Crear trabajador" });
    expect(trigger).toHaveClass("w-full", "sm:w-fit");
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Crear trabajador" })).toBeInTheDocument();
    expect(screen.getByText("Registra un maestro o ayudante para las asignaciones operativas.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Crear trabajador" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(document.querySelector("[data-dialog-overlay]")!);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Crear trabajador" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("opens the create form in a sheet with Cancelar left and Crear trabajador right in the footer", async () => {
    const user = userEvent.setup();
    render(<WorkerCreateDialog action={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Crear trabajador" }));

    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveAttribute("data-dialog-variant", "sheet");
    const footer = sheet.querySelector("[data-dialog-footer]") as HTMLElement;
    expect(within(footer).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Cancelar",
      "Crear trabajador",
    ]);
  });

  it("derives a read-only email and submits through the footer button linked to the form", async () => {
    const user = userEvent.setup();

    render(<WorkerCreateDialog action={vi.fn()} />);

    expect(screen.queryByTestId("worker-create-form")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Crear trabajador" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("worker-create-form")).toBeInTheDocument();

    const username = screen.getByLabelText("Usuario interno");
    const email = screen.getByLabelText("Correo interno");
    await user.type(username, "ana.lopez");

    expect(email).toHaveValue("ana.lopez@sebasam.local");
    expect(email).toHaveAttribute("readonly");
    const submit = within(screen.getByRole("dialog")).getByRole("button", { name: "Crear trabajador" });
    expect(submit).toHaveAttribute("form", screen.getByTestId("worker-create-form").id);
  });

  it("keeps the form action, preserves its payload, and locks dismissal while pending", async () => {
    const action = vi.fn<(formData: FormData) => Promise<void>>(() => new Promise<void>(() => {}));
    const user = userEvent.setup();
    render(<WorkerCreateDialog action={action} />);

    await user.click(screen.getByRole("button", { name: "Crear trabajador" }));
    await user.type(screen.getByLabelText("Nombre"), "Ana Lopez");
    await user.type(screen.getByLabelText("Usuario interno"), "ana.lopez");

    expect(screen.getByTestId("worker-create-form")).toHaveAttribute("action");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Crear trabajador" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries((action.mock.calls[0][0] as FormData).entries())).toEqual({
      displayName: "Ana Lopez",
      username: "ana.lopez",
      workerKind: "MASTER",
    });
    expect(screen.getByText("Creando trabajador...")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await user.keyboard("{Escape}");
    await user.click(document.querySelector("[data-dialog-overlay]")!);

    expect(screen.getByRole("dialog", { name: "Crear trabajador" })).toBeInTheDocument();
  });
});
