import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
const upload = vi.hoisted(() => vi.fn());
vi.mock("./receipt-upload", () => ({ uploadReceipt: upload }));

import { ExpenseFormDialog } from "./expense-form-dialog";

describe("ExpenseFormDialog", () => {
  it("opens a new-expense form with today's date, Renta and no invoice", async () => {
    const user = userEvent.setup();
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);

    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    const form = screen.getByTestId("expense-form");
    expect(screen.getByRole("dialog", { name: "Nuevo gasto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-11-23");
    expect(screen.getByRole("radio", { name: "Sin factura" })).toBeChecked();
    expect(form.querySelector('input[name="month"]')).toHaveValue("2026-11");
  });

  it("never shows how the expense is split between the two accounts", async () => {
    const user = userEvent.setup();
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    const form = screen.getByTestId("expense-form");
    expect(screen.queryByLabelText(/porcentaje/i)).not.toBeInTheDocument();
    expect(form.querySelector('[name="partsSharePercent"]')).toBeNull();
    expect(screen.queryByText(/a refacciones|a mano de obra|reparto|cuenta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mano de obra/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Categoría" }));
    await user.click(screen.getByRole("option", { name: "Combustible y traslados" }));
    expect(screen.queryByLabelText(/porcentaje/i)).not.toBeInTheDocument();
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
    expect(screen.getByLabelText("Proveedor (opcional)")).toHaveValue("Gasolinera");
    expect(screen.queryByLabelText(/porcentaje/i)).not.toBeInTheDocument();
  });

  it("proposes the usual category and invoice status of a known supplier, only on a new expense", async () => {
    const user = userEvent.setup();
    const suppliers = [{ name: "Refaccionaria Uno", usuallyInvoiced: true, category: "PARTS_PURCHASE" }];
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" suppliers={suppliers} />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    expect(screen.getByTestId("expense-form").querySelector("datalist option")).toHaveAttribute("value", "Refaccionaria Uno");
    await user.type(screen.getByLabelText("Proveedor (opcional)"), "Refaccionaria Uno");

    expect(screen.getByRole("radio", { name: "Con factura" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveTextContent("Refacciones compradas");
  });

  it("offers to repeat a new expense every month, and not when editing one", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));
    expect(screen.getByRole("checkbox", { name: /repetir cada mes/i })).not.toBeChecked();
    unmount();

    const expense = { id: "e1", spentAt: new Date("2026-11-20T00:00:00Z"), amountCents: 500_000, category: "RENT", invoiceStatus: "NOT_INVOICED" as const, partsSharePercent: 0, supplier: null, paymentMethod: null, notes: null };
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" expense={expense} />);
    await user.click(screen.getByRole("button", { name: /editar gasto/i }));
    expect(screen.queryByRole("checkbox", { name: /repetir cada mes/i })).not.toBeInTheDocument();
  });

  it("fills the form with what was read from a receipt photo and attaches it, leaving the person to confirm", async () => {
    const user = userEvent.setup();
    upload.mockResolvedValue({ receiptPath: "0b9c6a5e-1d2f-4c3b-8a7e-5f4d3c2b1a09.jpg", extracted: { spentAt: "2026-11-19", amount: 850.5, supplier: "Gasolinera", category: "FUEL_TRANSPORT", invoiced: true } });
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));

    await user.upload(screen.getByLabelText(/foto o pdf del comprobante/i), new File(["x"], "ticket.jpg", { type: "image/jpeg" }));

    expect(await screen.findByText(/revisa lo que se leyó/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-11-19");
    expect(screen.getByLabelText("Monto (MXN)")).toHaveValue(850.5);
    expect(screen.getByLabelText("Proveedor (opcional)")).toHaveValue("Gasolinera");
    expect(screen.getByRole("radio", { name: "Con factura" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveTextContent("Combustible y traslados");
    expect(screen.getByTestId("expense-form").querySelector('input[name="receiptPath"]')).toHaveValue("0b9c6a5e-1d2f-4c3b-8a7e-5f4d3c2b1a09.jpg");
  });

  it("keeps the receipt and asks for manual entry when it could not be read, and shows an upload error", async () => {
    const user = userEvent.setup();
    upload.mockResolvedValueOnce({ receiptPath: "0b9c6a5e-1d2f-4c3b-8a7e-5f4d3c2b1a09.jpg", extracted: null });
    render(<ExpenseFormDialog action={vi.fn()} month="2026-11" today="2026-11-23" />);
    await user.click(screen.getByRole("button", { name: /nuevo gasto/i }));
    await user.upload(screen.getByLabelText(/foto o pdf del comprobante/i), new File(["x"], "t.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(/captura los datos a mano/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-11-23");

    upload.mockRejectedValueOnce(new Error("El archivo pesa más de 4 MB."));
    await user.upload(screen.getByLabelText(/foto o pdf del comprobante/i), new File(["x"], "t2.jpg", { type: "image/jpeg" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("más de 4 MB");
  });
});
