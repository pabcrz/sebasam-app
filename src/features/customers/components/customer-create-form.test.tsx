import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerCreateForm } from "./customer-create-form";

describe("CustomerCreateForm", () => {
  it("renders the expected labelled fields with the correct names", () => {
    render(<CustomerCreateForm action={vi.fn()} />);

    expect(screen.getByLabelText("Nombre")).toHaveAttribute("name", "name");
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("name", "phone");
    expect(screen.getByLabelText("Dirección")).toHaveAttribute("name", "address");
    expect(screen.getByLabelText("Notas")).toHaveAttribute("name", "notes");
  });

  it("submits a FormData with name, email, phone, address and notes", async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    render(<CustomerCreateForm action={action} />);

    await user.type(screen.getByLabelText("Nombre"), "Constructora del Norte");
    await user.type(screen.getByLabelText("Correo electrónico"), "contacto@cdn.mx");
    await user.type(screen.getByLabelText("Teléfono"), "55 1234 5678");
    await user.type(screen.getByLabelText("Dirección"), "Av. Siempre Viva 123");
    await user.type(screen.getByLabelText("Notas"), "Cliente frecuente");

    const form = screen.getByTestId("customer-create-form");
    fireEvent.submit(form);

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(formData.entries())).toEqual({
      name: "Constructora del Norte",
      email: "contacto@cdn.mx",
      phone: "55 1234 5678",
      address: "Av. Siempre Viva 123",
      notes: "Cliente frecuente",
    });
  });
});
