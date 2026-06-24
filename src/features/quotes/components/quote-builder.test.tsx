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
    await user.type(screen.getByLabelText("Modelo"), "Hilux");
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
    expect(screen.getByLabelText("Modelo")).toHaveAttribute("name", "model");
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it("exposes all required form field names for the server action", () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    expect(screen.getByLabelText("Modelo")).toHaveAttribute("name", "model");
    expect(screen.getByLabelText("Placas (opcional)")).toHaveAttribute("name", "plate");
    expect(screen.getByLabelText("Marca (opcional)")).toHaveAttribute("name", "brand");
    expect(screen.getByLabelText("Color")).toHaveAttribute("name", "color");
    expect(screen.getByLabelText("Año")).toHaveAttribute("name", "year");

    // Hidden item type inputs are rendered even while step is hidden.
    expect(document.querySelector('input[name="items.0.type"]')).toHaveAttribute("value", "SERVICE");
    expect(document.querySelector('input[name="items.0.description"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="items.0.quantity"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="items.0.unitPrice"]')).toBeInTheDocument();
  });

  it("shows a validation error when advancing without required data", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/selecciona un cliente/i);
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
    expect(screen.getByTestId("summary-vehicle")).toHaveTextContent(/hilux/i);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/vista previa de cotización/i)).toBeInTheDocument();

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    expect(action).toHaveBeenCalledTimes(1);

    const formData = action.mock.calls[0][0] as FormData;
    const entries = Object.fromEntries(formData.entries());

    expect(entries.customerId).toBe("cust-1");
    expect(entries.model).toBe("Hilux");
    expect(entries.title).toBe("Servicio general");
    expect(entries["items.0.description"]).toBe("Cambio de aceite");
    expect(entries["items.0.quantity"]).toBe("1");
    expect(entries["items.0.unitPrice"]).toBe("850");
    expect(entries["items.0.type"]).toBe("SERVICE");
  });

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
    expect(totals[0]).toHaveTextContent("$850.00");
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

  it("blocks advancing when a row has a blank description", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

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
});
