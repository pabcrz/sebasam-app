import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCreateForm } from "./user-create-form";

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

// Mock HTMLElement.prototype.scrollIntoView to prevent Radix Select errors
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("UserCreateForm", () => {
  it("renders the expected labelled fields with the correct names", () => {
    render(<UserCreateForm action={vi.fn()} />);

    expect(screen.getByLabelText("Nombre de usuario")).toHaveAttribute("name", "username");
    expect(screen.getByLabelText("Nombre a mostrar")).toHaveAttribute("name", "displayName");
    // Radix Select uses a hidden input for form submission, the label points to the trigger button
    expect(screen.getByLabelText("Contraseña inicial")).toHaveAttribute("name", "password");
  });

  it("submits a FormData with username, displayName, role and password", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(<UserCreateForm action={action} />);

    await user.type(screen.getByLabelText("Nombre de usuario"), "testuser");
    await user.type(screen.getByLabelText("Nombre a mostrar"), "Test User");
    await user.type(screen.getByLabelText("Contraseña inicial"), "supersecret");

    const form = screen.getByTestId("user-create-form");
    fireEvent.submit(form);

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(formData.entries())).toEqual({
      username: "testuser",
      displayName: "Test User",
      role: "WORKER",
      workerKind: "MASTER", // defaults to MASTER since role is WORKER
      password: "supersecret",
    });
  });
});
