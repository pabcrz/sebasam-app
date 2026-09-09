import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerCreateForm } from "./customer-create-form";

describe("CustomerCreateForm", () => {
  it("opens an accessible modal from the Nuevo cliente trigger", async () => {
    const user = userEvent.setup();

    render(<CustomerCreateForm action={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Nuevo cliente" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Nuevo cliente" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveFocus());

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Nuevo cliente" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(document.querySelector("[data-dialog-overlay]")!);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Nuevo cliente" })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("renders the expected labelled fields with the correct names", async () => {
    const user = userEvent.setup();

    render(<CustomerCreateForm action={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));

    expect(screen.getByLabelText("Nombre")).toHaveAttribute("name", "name");
    expect(screen.getByLabelText("Razón social formal (opcional)")).toHaveAttribute("name", "legalName");
    expect(screen.getByLabelText("Nombre o apodo del operador")).toHaveAttribute("name", "initialContactName");
    expect(screen.getByLabelText("Teléfono del operador (opcional)")).toHaveAttribute("name", "initialContactPhone");
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("name", "phone");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("maxlength", "20");
    expect(screen.getByLabelText("Dirección")).toHaveAttribute("name", "address");
    expect(screen.getByLabelText("Notas")).toHaveAttribute("name", "notes");
  });

  it("submits a FormData with name, email, phone, address and notes", async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    render(<CustomerCreateForm action={action} />);
    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));

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
      commercialName: "",
      legalName: "",
      initialContactName: "",
      initialContactPhone: "",
      email: "contacto@cdn.mx",
      phone: "55 1234 5678",
      address: "Av. Siempre Viva 123",
      notes: "Cliente frecuente",
    });
  });

  it("prevents dismissal and editing while creation is pending", async () => {
    const action = vi.fn(() => new Promise<void>(() => {}));
    const user = userEvent.setup();
    render(<CustomerCreateForm action={action} />);

    await user.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Constructora del Norte");
    await user.click(screen.getByRole("button", { name: "Crear cliente" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Creando cliente...")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await user.keyboard("{Escape}");
    await user.click(document.querySelector("[data-dialog-overlay]")!);

    expect(screen.getByRole("dialog", { name: "Nuevo cliente" })).toBeInTheDocument();
  });
});
