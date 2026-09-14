import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerEditForm } from "./customer-edit-form";

function buildCustomer() {
  return {
    id: "cust-1",
    name: "Constructora del Norte",
    email: "contacto@cdn.mx",
    phone: "55 1234 5678",
    address: "Av. Siempre Viva 123",
    notes: "Cliente frecuente",
    status: "ACTIVE",
  };
}

describe("CustomerEditForm", () => {
  it("renders the hidden customerId and expected field names", () => {
    render(<CustomerEditForm action={vi.fn()} customer={buildCustomer()} />);

    const hiddenId = document.querySelector('input[type="hidden"][name="customerId"]');
    expect(hiddenId).toHaveValue("cust-1");
    expect(screen.getByText("Información del cliente").tagName).toBe("LEGEND");
    expect(screen.getByText("Contacto y notas").tagName).toBe("LEGEND");

    expect(screen.getByLabelText("Nombre")).toHaveAttribute("name", "name");
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("name", "email");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("name", "phone");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("maxlength", "20");
    expect(screen.getByLabelText("Dirección")).toHaveAttribute("name", "address");
    expect(screen.getByLabelText("Notas")).toHaveAttribute("name", "notes");
  });

  it("uses a Radix Select that still serializes name=status for form submission", async () => {
    render(<CustomerEditForm action={vi.fn()} customer={buildCustomer()} />);

    const trigger = screen.getByRole("combobox", { name: "Estado" });
    expect(trigger).toBeInTheDocument();

    const hiddenStatus = await waitFor(() => {
      const element = document.querySelector('select[name="status"]');
      if (!element) throw new Error("Hidden status select not found");
      return element as HTMLSelectElement;
    });

    expect(hiddenStatus).toHaveValue("ACTIVE");

    fireEvent.change(hiddenStatus, { target: { value: "INACTIVE" } });
    expect(hiddenStatus).toHaveValue("INACTIVE");

    const form = document.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).get("status")).toBe("INACTIVE");
  });

  it("submits a FormData with customerId, name, email, phone, status, address and notes", async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    render(<CustomerEditForm action={action} customer={buildCustomer()} />);

    const nameInput = screen.getByLabelText("Nombre");
    await user.clear(nameInput);
    await user.type(nameInput, "Constructora del Sur");

    const hiddenStatus = document.querySelector('select[name="status"]') as HTMLSelectElement;
    fireEvent.change(hiddenStatus, { target: { value: "INACTIVE" } });

    const form = screen.getByTestId("customer-edit-form");
    fireEvent.submit(form);

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(formData.entries())).toEqual({
      customerId: "cust-1",
      name: "Constructora del Sur",
      commercialName: "",
      legalName: "",
      email: "contacto@cdn.mx",
      phone: "55 1234 5678",
      status: "INACTIVE",
      address: "Av. Siempre Viva 123",
      notes: "Cliente frecuente",
    });
  });

  it("shows and clears a meaningful-name error before submission", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<CustomerEditForm action={action} customer={buildCustomer()} />);

    const name = screen.getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "...");
    expect(screen.getByRole("alert")).toHaveTextContent("El nombre debe incluir texto significativo.");
    fireEvent.submit(screen.getByTestId("customer-edit-form"));
    expect(action).not.toHaveBeenCalled();

    await user.clear(name);
    await user.type(name, "Constructora del Sur");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
