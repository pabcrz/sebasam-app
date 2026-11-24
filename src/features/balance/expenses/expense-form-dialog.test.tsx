import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExpenseFormDialog } from "./expense-form-dialog";

describe("ExpenseFormDialog", () => {
  it("opens a new-expense form with today's date, Renta and no invoice, all to labor", async () => {
    const user = userEvent.setup();
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);

    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    const form = screen.getByTestId("expense-form");
    expect(screen.getByRole("dialog", { name: "Nuevo gasto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-11-23");
    expect(screen.getByLabelText("Porcentaje a refacciones")).toHaveValue(0);
    expect(screen.getByRole("radio", { name: "Sin factura" })).toBeChecked();
    expect(form.querySelector('input[name="month"]')).toHaveValue("2026-11");
  });

  it("proposes the category's share when the category changes", async () => {
    const user = userEvent.setup();
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    await user.click(screen.getByRole("combobox", { name: "Categoría" }));
    await user.click(screen.getByRole("option", { name: "Combustible y traslados" }));
    expect(screen.getByLabelText("Porcentaje a refacciones")).toHaveValue(50);

    await user.click(screen.getByRole("combobox", { name: "Categoría" }));
    await user.click(screen.getByRole("option", { name: "Refacciones compradas" }));
    expect(screen.getByLabelText("Porcentaje a refacciones")).toHaveValue(100);
  });

  it("lets the user switch between with and without invoice", async () => {
    const user = userEvent.setup();
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    await user.click(screen.getByRole("radio", { name: "Con factura" }));

    expect(screen.getByRole("radio", { name: "Con factura" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Sin factura" })).not.toBeChecked();
  });

  it("edits an existing expense with its saved values", async () => {
    const user = userEvent.setup();
    render(
      <ExpenseFormDialog
        action={vi.fn()}
        month="2026-11"
        today="2026-11-23"
        expense={{ id: "e1", spentAt: new Date("2026-11-18T00:00:00Z"), amountCents: 123_450, category: "FUEL_TRANSPORT", invoiceStatus: "INVOICED", partsSharePercent: 50, supplier: "Gasolinera", paymentMethod: "CASH", notes: "Nota" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /editar gasto/i }));

    expect(screen.getByRole("dialog", { name: "Editar gasto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-11-18");
    expect(screen.getByLabelText("Monto (MXN)")).toHaveValue(1234.5);
    expect(screen.getByRole("radio", { name: "Con factura" })).toBeChecked();
    expect(screen.getByLabelText("Porcentaje a refacciones")).toHaveValue(50);
    expect(screen.getByLabelText("Proveedor (opcional)")).toHaveValue("Gasolinera");
  });
});
