import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomerEditDialog } from "./customer-edit-dialog";

const customer = {
  id: "cust-1",
  name: "Taller Hermanos",
  email: "contacto@tallerhermanos.com",
  phone: "55 1234 5678",
  address: "Av. Principal 123",
  notes: "Cliente preferente",
  status: "ACTIVE",
};

describe("CustomerEditDialog", () => {
  it("renders prepopulated customer fields when open", () => {
    render(
      <CustomerEditDialog
        open={true}
        onOpenChange={vi.fn()}
        customer={customer}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: /editar cliente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toHaveValue("Taller Hermanos");
    expect(screen.getByLabelText(/correo/i)).toHaveValue("contacto@tallerhermanos.com");
    expect(screen.getByLabelText(/teléfono/i)).toHaveValue("55 1234 5678");
    expect(screen.getByLabelText(/dirección/i)).toHaveValue("Av. Principal 123");
    expect(screen.getByLabelText(/notas/i)).toHaveValue("Cliente preferente");
  });

  it("submits updated customer data and closes on success", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    const handleSave = vi.fn().mockResolvedValue({ success: true });

    render(
      <CustomerEditDialog
        open={true}
        onOpenChange={handleOpenChange}
        customer={customer}
        onSave={handleSave}
      />,
    );

    const nameInput = screen.getByLabelText(/nombre/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Taller Nuevo");

    const phoneInput = screen.getByLabelText(/teléfono/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "5599887766");

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "cust-1",
          name: "Taller Nuevo",
          phone: "5599887766",
        }),
      );
    });

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows an error message and stays open if save fails", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    const handleSave = vi.fn().mockResolvedValue({ success: false, error: "Error de validación" });

    render(
      <CustomerEditDialog
        open={true}
        onOpenChange={handleOpenChange}
        customer={customer}
        onSave={handleSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Error de validación");
    });
    expect(handleOpenChange).not.toHaveBeenCalled();
  });
});
