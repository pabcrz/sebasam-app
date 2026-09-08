import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomerActionsMenu } from "./customer-actions-menu";

const customer = {
  id: "cust-1",
  name: "Taller Hermanos",
  email: "contacto@tallerhermanos.com",
  phone: "55 1234 5678",
  status: "ACTIVE",
};

describe("CustomerActionsMenu", () => {
  it("renders trigger and displays actions on open", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleViewStatement = vi.fn();

    render(
      <CustomerActionsMenu
        customer={customer}
        blocker={{ canDelete: true, reason: null }}
        onEdit={handleEdit}
        onViewStatement={handleViewStatement}
        onDelete={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /más acciones de taller hermanos/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("heading", { name: /acciones de cliente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar datos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver estado de cuenta/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /editar datos/i }));
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it("enables delete when customer has zero related history", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();

    render(
      <CustomerActionsMenu
        customer={customer}
        blocker={{ canDelete: true, reason: null }}
        onEdit={vi.fn()}
        onViewStatement={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: /más acciones/i }));

    const deleteBtn = screen.getByRole("button", { name: /eliminar cliente/i });
    expect(deleteBtn).toBeEnabled();

    await user.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it("disables delete and displays inline reason when customer has deletion blocker", async () => {
    const user = userEvent.setup();

    render(
      <CustomerActionsMenu
        customer={customer}
        blocker={{
          canDelete: false,
          reason: "No se puede eliminar: tiene 2 cotizaciones asociadas",
        }}
        onEdit={vi.fn()}
        onViewStatement={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /más acciones/i }));

    const deleteBtn = screen.getByRole("button", { name: /eliminar cliente/i });
    expect(deleteBtn).toBeDisabled();
    expect(
      screen.getByText("No se puede eliminar: tiene 2 cotizaciones asociadas"),
    ).toBeInTheDocument();
  });
});
