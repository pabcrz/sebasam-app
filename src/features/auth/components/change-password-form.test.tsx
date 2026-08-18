import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "./change-password-form";

describe("ChangePasswordForm", () => {
  it("validates interactively in a stable accessible error slot and toggles password visibility", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<ChangePasswordForm action={action} />);

    const password = screen.getByLabelText("Nueva contraseña");
    await user.type(password, "password-1");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "password-2");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Las contraseñas no coinciden.");
    expect(password).toHaveAttribute("aria-describedby", error.id);
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(action).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole("button", { name: "Mostrar contraseña" })[0]);
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute("aria-pressed", "true");
  });
});
