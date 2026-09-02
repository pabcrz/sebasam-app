import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCreateDialog } from "./user-create-dialog";

// Mock PointerEvent to prevent Radix Select errors
if (typeof global.PointerEvent === "undefined") {
  class MockPointerEvent extends MouseEvent {
    pointerId = 1;
    width = 1;
    height = 1;
    pressure = 0;
    tangentialPressure = 0;
    tiltX = 0;
    tiltY = 0;
    twist = 0;
    pointerType = "mouse";
    isPrimary = true;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      Object.assign(this, params);
    }
  }
  global.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
}

if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("UserCreateDialog", () => {
  it("opens the dialog from a modal trigger and allows dismissal", async () => {
    const user = userEvent.setup();
    render(<UserCreateDialog action={vi.fn().mockResolvedValue({ success: true })} />);

    const trigger = screen.getByRole("button", { name: "Crear usuario" });
    expect(trigger).toHaveClass("w-full", "sm:w-fit");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Crear usuario" })).toBeInTheDocument();
    expect(
      screen.getByText("Registra un nuevo usuario con credenciales de acceso y asignación de rol."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("user-create-form")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits the form and closes dialog on success", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<UserCreateDialog action={action} />);

    await user.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre de usuario"), "carlos");
    await user.type(screen.getByLabelText("Nombre a mostrar"), "Carlos Ruiz");
    await user.type(screen.getByLabelText("Contraseña inicial"), "password123");

    const submitBtn = within(screen.getByTestId("user-create-form")).getByRole("button", {
      name: "Crear usuario",
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
