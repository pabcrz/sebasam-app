import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilder } from "./quote-builder";

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Taller Hermanos Pérez" },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function fillClientStep(user: ReturnType<typeof userEvent.setup>) {
  return async () => {
    await user.click(screen.getByRole("combobox", { name: /cliente/i }));
    await user.click(screen.getByRole("option", { name: "Constructora del Norte" }));
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-1");
  };
}

function fillItemsStep(user: ReturnType<typeof userEvent.setup>) {
  return async () => {
    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.clear(quantityInput);
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

    expect(screen.queryByRole("heading", { name: /cotización/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("quote-builder-scroll-area")).toBeInTheDocument();
    expect(screen.getByTestId("quote-builder-footer")).toHaveClass("shrink-0");
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

  it("creates and selects a customer without leaving the builder", async () => {
    const user = userEvent.setup();
    const createCustomerAction = vi.fn().mockResolvedValue({
      success: true,
      reused: false,
      customer: { id: "cust-3", name: "Grúas del Centro" },
    });

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        createCustomerAction={createCustomerAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Crear cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Grúas del Centro");
    await user.type(screen.getByLabelText("Correo electrónico"), "cliente@gruas.test");
    await user.type(screen.getByLabelText("Teléfono"), "55 3333 4444");
    await user.click(screen.getByRole("button", { name: "Guardar y seleccionar" }));

    await waitFor(() => {
      expect(createCustomerAction).toHaveBeenCalledWith({
        name: "Grúas del Centro",
        email: "cliente@gruas.test",
        phone: "55 3333 4444",
        address: "",
        notes: "",
      });
      expect(screen.getByRole("button", { name: "Siguiente" })).not.toBeDisabled();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Cliente creado y seleccionado.");
    expect(screen.getByRole("combobox", { name: /cliente/i })).toHaveValue("Grúas del Centro");
    expect(screen.getByText(/cliente seleccionado:/i)).toHaveTextContent("Grúas del Centro");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-3");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByTestId("summary-customer")).toHaveTextContent("Grúas del Centro");
  });

  it("searches the server after a debounce and selects a result outside the initial list", async () => {
    const user = userEvent.setup();
    const searchCustomersAction = vi.fn().mockResolvedValue([
      { id: "cust-101", name: "Cliente ciento uno" },
    ]);

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={searchCustomersAction}
      />,
    );

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.type(search, "ciento uno");
    expect(searchCustomersAction).not.toHaveBeenCalled();

    await waitFor(() => expect(searchCustomersAction).toHaveBeenCalledTimes(1));
    expect(searchCustomersAction).toHaveBeenCalledWith({ query: "ciento uno" });

    await user.click(await screen.findByRole("option", { name: "Cliente ciento uno" }));
    expect(search).toHaveValue("Cliente ciento uno");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-101");
  });

  it("shows a loading status while customer search is pending", async () => {
    const user = userEvent.setup();
    const pendingSearch = deferred<Array<{ id: string; name: string }>>();

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={vi.fn().mockReturnValue(pendingSearch.promise)}
      />,
    );

    await user.type(screen.getByRole("combobox", { name: /cliente/i }), "pendiente");

    expect(await screen.findByRole("status")).toHaveTextContent("Buscando clientes...");
    pendingSearch.resolve([]);
    await waitFor(() => expect(screen.queryByText("Buscando clientes...")).not.toBeInTheDocument());
  });

  it("shows a search error and recovers on the next query", async () => {
    const user = userEvent.setup();
    const searchCustomersAction = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce([{ id: "cust-recovered", name: "Cliente recuperado" }]);

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={searchCustomersAction}
      />,
    );

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.type(search, "falla");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo buscar clientes. Intenta de nuevo.",
    );

    await user.clear(search);
    await user.type(search, "recuperado");

    expect(await screen.findByRole("option", { name: "Cliente recuperado" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(searchCustomersAction).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state when customer search returns no results", async () => {
    const user = userEvent.setup();

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={vi.fn().mockResolvedValue([])}
      />,
    );

    await user.type(screen.getByRole("combobox", { name: /cliente/i }), "sin coincidencias");

    expect(await screen.findByText("No se encontraron clientes.")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("keeps a manually selected customer visible when an older search resolves late", async () => {
    const user = userEvent.setup();
    const pendingSearch = deferred<Array<{ id: string; name: string }>>();
    const searchCustomersAction = vi.fn().mockReturnValue(pendingSearch.promise);

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={searchCustomersAction}
      />,
    );

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.type(search, "norte");
    await waitFor(() => expect(searchCustomersAction).toHaveBeenCalledOnce());
    await user.click(screen.getByRole("option", { name: "Constructora del Norte" }));

    pendingSearch.resolve([{ id: "cust-late", name: "Respuesta tardía" }]);

    await waitFor(() => expect(search).toHaveValue("Constructora del Norte"));
    expect(screen.getByText(/cliente seleccionado:/i)).toHaveTextContent("Constructora del Norte");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-1");
  });

  it("keeps a created customer visible when an older search resolves late", async () => {
    const user = userEvent.setup();
    const pendingSearch = deferred<Array<{ id: string; name: string }>>();
    const searchCustomersAction = vi.fn().mockReturnValue(pendingSearch.promise);
    const createCustomerAction = vi.fn().mockResolvedValue({
      success: true,
      customer: { id: "cust-new", name: "Cliente recién creado" },
    });

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={searchCustomersAction}
        createCustomerAction={createCustomerAction}
      />,
    );

    await user.type(screen.getByRole("combobox", { name: /cliente/i }), "pendiente");
    await waitFor(() => expect(searchCustomersAction).toHaveBeenCalledOnce());
    await user.click(screen.getByRole("button", { name: "Crear cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Cliente recién creado");
    await user.click(screen.getByRole("button", { name: "Guardar y seleccionar" }));

    pendingSearch.resolve([{ id: "cust-late", name: "Respuesta tardía" }]);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /cliente/i })).toHaveValue("Cliente recién creado");
    });
    expect(screen.getByText(/cliente seleccionado:/i)).toHaveTextContent("Cliente recién creado");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-new");
  });

  it("supports arrow navigation, active option, Enter selection and Escape dismissal", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.click(search);
    await user.keyboard("{ArrowDown}");
    expect(search).toHaveAttribute("aria-activedescendant", "customer-option-cust-1");

    await user.keyboard("{ArrowDown}");
    expect(search).toHaveAttribute("aria-activedescendant", "customer-option-cust-2");
    expect(screen.getByRole("option", { name: "Taller Hermanos Pérez" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Enter}");
    expect(search).toHaveValue("Taller Hermanos Pérez");
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-2");

    await user.click(search);
    expect(search).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-2");
  });

  it("wraps ArrowUp to the last option and selects the active customer with Enter", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.click(search);
    await user.keyboard("{ArrowUp}");

    expect(search).toHaveAttribute("aria-activedescendant", "customer-option-cust-2");
    expect(screen.getByRole("option", { name: "Taller Hermanos Pérez" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{Enter}");
    expect(search).toHaveValue("Taller Hermanos Pérez");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-2");
  });

  it("visibly selects a reused customer and shows the existing-customer message", async () => {
    const user = userEvent.setup();
    const createCustomerAction = vi.fn().mockResolvedValue({
      success: true,
      reused: true,
      customer: { id: "cust-existing", name: "Cliente existente" },
    });

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        createCustomerAction={createCustomerAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Crear cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Cliente existente");
    await user.click(screen.getByRole("button", { name: "Guardar y seleccionar" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Cliente existente seleccionado.");
    expect(screen.getByRole("combobox", { name: /cliente/i })).toHaveValue("Cliente existente");
    expect(screen.getByText(/cliente seleccionado:/i)).toHaveTextContent("Cliente existente");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-existing");
  });

  it("preserves and visibly displays the initial customer in edit mode", () => {
    render(
      <QuoteBuilder
        customers={[{ id: "cust-old", name: "Cliente histórico" }]}
        saveAction={vi.fn()}
        initialData={{
          customerId: "cust-old",
          vehicle: { plate: "", brand: "", model: "", year: "" },
          title: "Cotización existente",
          description: "",
          administrative: false,
          taxEnabled: true,
          items: [],
        }}
      />,
    );

    expect(screen.getByRole("combobox", { name: /cliente/i })).toHaveValue("Cliente histórico");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-old");
  });

  it("recovers when customer creation fails unexpectedly", async () => {
    const user = userEvent.setup();
    const createCustomerAction = vi.fn().mockRejectedValue(new Error("Unauthorized"));

    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        createCustomerAction={createCustomerAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Crear cliente" }));
    await user.type(screen.getByLabelText("Nombre"), "Grúas del Centro");
    await user.click(screen.getByRole("button", { name: "Guardar y seleccionar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo crear el cliente. Intenta de nuevo.");
    expect(screen.getByRole("button", { name: "Guardar y seleccionar" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
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

    expect(screen.getByRole("heading", { name: "Resumen", level: 2 })).toHaveFocus();
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

  it("resets step scroll and focuses the active heading after a transition", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const scrollArea = screen.getByTestId("quote-builder-scroll-area");
    scrollArea.scrollTop = 240;
    expect(document.activeElement).not.toBe(screen.getByRole("heading", { name: "Cliente y unidad" }));

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => {
      expect(scrollArea.scrollTop).toBe(0);
      expect(screen.getByRole("heading", { name: "Conceptos", level: 2 })).toHaveFocus();
    });
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

  it("blocks advancing when a row quantity is empty", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.clear(quantityInput);
    await user.type(unitPriceInput, "850");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/concepto 1 necesita una cantidad/i)).toBeInTheDocument();
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
    await user.clear(quantityInput);
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "-100");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/precio unitario.*no puede ser negativo/i)).toBeInTheDocument();
  });

  it("clamps quantity input to a maximum of 100 on blur", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [typeTrigger] = screen.getAllByRole("combobox");
    await user.click(typeTrigger);
    await user.click(screen.getByRole("option", { name: "Material" }));

    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, "101");
    await user.tab();

    expect(quantityInput).toHaveValue("100");
  });

  it("clamps LABOR and SERVICE quantity to a maximum of 5 on blur", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, "6");
    await user.tab();

    expect(quantityInput).toHaveValue("5");
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
    await user.clear(quantityInput);
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "50000.01");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/precio unitario.*demasiado alto/i)).toBeInTheDocument();
  });

  it("blocks advancing when a row has a blank description", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [firstDescriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [firstQuantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [firstUnitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(firstDescriptionInput, "Cambio de aceite");
    await user.clear(firstQuantityInput);
    await user.type(firstQuantityInput, "1");
    await user.type(firstUnitPriceInput, "850");

    // Add a second concept so the blank-description test targets row 2.
    await user.click(screen.getByRole("button", { name: "+ Agregar concepto" }));

    const [, descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [, quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [, unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "   ");
    await user.clear(quantityInput);
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "100");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/concepto 2 necesita una descripción/i)).toBeInTheDocument();
  });

  it("strips non-digit characters from quantity input", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, "12.34");

    expect(quantityInput).toHaveValue("1234");
  });

  it("blocks advancing when a row is only partially filled", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    await user.type(descriptionInput, "Solo descripción");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/concepto 1 necesita un precio unitario/i)).toBeInTheDocument();
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

  it("limits the vehicle plate input to 10 characters", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const plateInput = screen.getByLabelText("Placas (opcional)");
    expect(plateInput).toHaveAttribute("maxLength", "10");

    await user.type(plateInput, "ABCDEFGHIJKLMNOP");
    expect(plateInput).toHaveValue("ABCDEFGHIJ");
  });

  it("caps the vehicle year input at the current year plus one", () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const yearInput = screen.getByLabelText("Año (opcional)");
    expect(yearInput).toHaveAttribute("max", String(new Date().getFullYear() + 1));
  });

  it("duplicates a concept row directly after the source row", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.clear(quantityInput);
    await user.type(quantityInput, "3");
    await user.type(unitPriceInput, "850");

    await user.click(screen.getByRole("button", { name: "Duplicar concepto 1" }));

    const descriptions = Array.from(document.querySelectorAll('input[name$=".description"]'));
    expect(descriptions).toHaveLength(2);
    expect(descriptions[1]).toHaveValue("Cambio de aceite");

    const quantities = Array.from(document.querySelectorAll('input[name$=".quantity"]'));
    expect(quantities[1]).toHaveValue("3");

    const unitPrices = Array.from(document.querySelectorAll('input[name$=".unitPrice"]'));
    expect(unitPrices[1]).toHaveValue(850);

    expect(document.querySelector('input[name="items.1.type"]')).toHaveValue("LABOR");
  });

  it("groups quantity and price with a concise formatted line amount", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);
    const [unitPriceInput] = screen.getAllByLabelText(/precio unitario/i);

    await user.type(descriptionInput, "Cambio de aceite");
    await user.clear(quantityInput);
    await user.type(quantityInput, "1");
    await user.type(unitPriceInput, "850");

    const quantityPriceRow = screen.getByTestId("quantity-price-row-0");
    expect(quantityPriceRow).toContainElement(quantityInput);
    expect(quantityPriceRow).toContainElement(unitPriceInput);
    expect(quantityPriceRow).toHaveClass("grid-cols-[minmax(0,1fr)_minmax(0,1fr)]");
    expect(quantityInput.parentElement).toHaveClass("min-w-0");
    expect(unitPriceInput.parentElement).toHaveClass("min-w-0");
    expect(screen.getByLabelText("Precio unitario")).toHaveAccessibleDescription("Importe en pesos mexicanos.");
    expect(screen.getByTestId("currency-prefix-0")).toHaveTextContent("$");
    expect(screen.getByText("Importe")).toBeInTheDocument();
    expect(screen.getByTestId("concept-total-0")).toHaveTextContent("$850.00");
    expect(quantityPriceRow.parentElement).not.toHaveTextContent("1 × $850.00");
    expect(screen.getByRole("button", { name: "Duplicar concepto 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar concepto 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Agregar concepto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Material" })).not.toBeInTheDocument();
  });

  it("renders semantic icons and scannable rows in summary and preview", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    const notesDescription = document.querySelector('textarea[name="description"]');
    expect(notesDescription).toBeInstanceOf(HTMLTextAreaElement);
    await user.type(notesDescription as HTMLTextAreaElement, "Notas de servicio");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByTestId("summary-customer-icon")).toBeInTheDocument();
    expect(screen.getByTestId("summary-vehicle-icon")).toBeInTheDocument();
    expect(screen.getByTestId("summary-items-icon")).toBeInTheDocument();
    expect(screen.getByTestId("summary-notes-icon")).toBeInTheDocument();
    expect(screen.getAllByText("1 × $850.00").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByTestId("preview-customer-icon")).toBeInTheDocument();
    expect(screen.getByTestId("preview-vehicle-icon")).toBeInTheDocument();
    expect(screen.getByTestId("preview-items-icon")).toBeInTheDocument();
    expect(screen.getByTestId("preview-notes-icon")).toBeInTheDocument();
  });
});
