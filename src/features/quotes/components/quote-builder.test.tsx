import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilder } from "./quote-builder";

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Taller Hermanos Pérez" },
];

function fillClientStep(user: ReturnType<typeof userEvent.setup>) {
  return async () => {
    await user.click(screen.getByRole("combobox", { name: /cliente/i }));

    try {
      await user.click(await screen.findByRole("option", { name: "Constructora del Norte" }, { timeout: 500 }));
    } catch {
      // jsdom does not always open Radix Select portals through pointer events.
      // Use the hidden form select that Radix renders for submission instead.
      const hiddenSelect = await waitFor(() => {
        const element = document.querySelector('select[name="customerId"]');
        if (!element) throw new Error("Hidden customer select not found");
        return element;
      });
      fireEvent.change(hiddenSelect, { target: { value: "cust-1" } });
    }

    await waitFor(() => {
      expect(document.querySelector('select[name="customerId"]')).toHaveValue("cust-1");
    });
  };
}

function fillItemsStep(user: ReturnType<typeof userEvent.setup>) {
  return async () => {
    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "850");
  };
}

function fillNotesStep(user: ReturnType<typeof userEvent.setup>) {
  return async () => {
    await user.type(screen.getByLabelText("Título"), "Servicio general");
  };
}

describe("QuoteBuilder", () => {
  it("renders the five-step flow and starts on the client/vehicle step", () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Crear cotización en borrador" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /pasos de cotización/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /cliente/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Modelo (opcional)")).toHaveAttribute("name", "model");
    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
  });

  it("exposes all required form field names for the server action", () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    expect(screen.getByLabelText("Modelo (opcional)")).toHaveAttribute("name", "model");
    expect(screen.getByLabelText("Placas (opcional)")).toHaveAttribute("name", "plate");
    expect(screen.getByLabelText("Marca (opcional)")).toHaveAttribute("name", "brand");
    expect(screen.queryByLabelText("Color")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Año (opcional)")).toHaveAttribute("name", "year");

    // Hidden item type inputs are rendered even while step is hidden.
    expect(document.querySelector('input[name="items.0.type"]')).toHaveAttribute("value", "LABOR");
    expect(document.querySelector('input[name="items.0.description"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="items.0.quantity"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="items.0.unitPrice"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="taxEnabled"]')).toHaveValue("on");
  });

  it("keeps the next button disabled on the first step until a customer is selected", async () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("advances through all steps and submits the expected FormData", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByTestId("summary-customer")).toHaveTextContent("Constructora del Norte");
    expect(screen.getByTestId("summary-vehicle")).toHaveTextContent("Sin datos de vehículo");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/vista previa de cotización/i)).toBeInTheDocument();

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    const entries = Object.fromEntries(formData.entries());

    expect(entries.customerId).toBe("cust-1");
    expect(entries.title).toBe("Servicio general");
    expect(entries["items.0.description"]).toBe("Cambio de aceite");
    expect(entries["items.0.quantity"]).toBe("1");
    expect(entries["items.0.unitPrice"]).toBe("850");
    expect(entries["items.0.type"]).toBe("LABOR");
  }, 10_000);

  it("computes and displays the running total", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const totals = screen.getAllByTestId("quote-total");
    expect(totals.length).toBeGreaterThanOrEqual(1);
    expect(totals[0]).toHaveTextContent("$986.00");

    const taxes = screen.getAllByTestId("quote-tax");
    expect(taxes.length).toBeGreaterThanOrEqual(1);
    expect(taxes[0]).toHaveTextContent("$136.00");
  });

  it("allows jumping back to a completed step from the stepper", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByLabelText("Título")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Paso 1: Cliente / Unidad" }));

    expect(screen.getByRole("combobox", { name: /cliente/i })).toBeInTheDocument();
  });

  it("disables the next button on the first step until a customer is selected", async () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const nextButton = screen.getByRole("button", { name: "Siguiente" });
    expect(nextButton).toBeDisabled();

    // No "Anterior" button should render on the first step.
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
  });

  it("advances with only a customer and no vehicle data", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("customerId")).toBe("cust-1");
    expect(formData.get("model")).toBe("");
    expect(formData.get("plate")).toBe("");
    expect(formData.get("brand")).toBe("");
    expect(formData.get("year")).toBe("");
  });

  it("blocks advancing when a row has quantity 0", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.type(quantityInput, "0");
    await user.type(unitPriceInput, "850");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/cantidad.*mayor a 0/i);
  });

  it("blocks advancing when a row has a negative unit price", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "-100");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/precio unitario.*no puede ser negativo/i);
  });

  it("blocks advancing when a row quantity is greater than 100", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Bajar dos muelles");
    await user.type(quantityInput, "101");
    await user.type(unitPriceInput, "850");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/cantidad.*no puede ser mayor a 100/i);
  });

  it("blocks advancing when a row unit price is greater than 50000", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Bajar dos muelles");
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "50000.01");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/precio unitario.*demasiado alto/i);
  });

  it("blocks advancing when a row has a blank description", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // Add a second concept so the blank-description test targets row 2.
    await user.click(screen.getByRole("button", { name: "+ Agregar concepto" }));

    const [, descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [, quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [, unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "   ");
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "100");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/concepto 2 necesita una descripción/i);
  });

  it("blocks advancing when a row has too many decimal places in quantity", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.type(quantityInput, "1.234");
    await user.type(unitPriceInput, "850");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/cantidad.*admite hasta 2 decimales/i);
  });

  it("blocks advancing when a row is only partially filled", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    await user.type(descriptionInput, "Solo descripción");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/concepto 1 necesita una cantidad/i);
  });

  it("prevents submission from hidden steps", async () => {
    const action = vi.fn();
    render(<QuoteBuilder customers={customers} createAction={action} />);

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/avanza al último paso/i);
  });

  it("lets the user disable IVA and updates the total", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillNotesStep(user)();
    await user.click(screen.getByRole("checkbox", { name: /incluir iva/i }));

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const totals = screen.getAllByTestId("quote-total");
    expect(totals[0]).toHaveTextContent("$850.00");

    const taxes = screen.getAllByTestId("quote-tax");
    expect(taxes[0]).toHaveTextContent("$0.00");

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("taxEnabled")).toBe("off");
  });

  it("shows the validity note in the preview step", async () => {
    const user = userEvent.setup();

    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByTestId("quote-validity")).toHaveTextContent(/vigente hasta/i);
    expect(screen.getByTestId("quote-validity")).toHaveTextContent(/cambios imprevistos/i);
  });
});
