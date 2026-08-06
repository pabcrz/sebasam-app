import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkerCreateDialog } from "./worker-create-dialog";

describe("WorkerCreateDialog", () => {
  it("opens the create form from a modal trigger with a derived read-only email", async () => {
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
    expect(
      within(screen.getByTestId("worker-create-form")).getByRole("button", {
        name: "Crear trabajador",
      }),
    ).toBeInTheDocument();
  });
});
