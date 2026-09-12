import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilder } from "./quote-builder";
import { getStepError } from "./quote-builder-shared";

const customers = [
  { id: "cust-1", name: "Constructora del Norte" },
  { id: "cust-2", name: "Taller Hermanos Pérez" },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
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
  it("renders the four-step flow and starts on the client/vehicle step", () => {
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
    expect(screen.getByLabelText("Fecha de cotización")).toHaveAttribute("name", "operationalDate");

    // Hidden item type inputs are rendered even while step is hidden.
    expect(document.querySelector('input[name="sections.0.items.0.type"]')).toHaveAttribute("value", "LABOR");
    expect(document.querySelector('input[name="sections.0.items.0.description"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="sections.0.items.0.quantity"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="sections.0.items.0.unitPrice"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="taxEnabled"]')).toHaveValue("on");
  });

  it("requires either a customer or identifiable unit data before leaving the first step", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecciona un cliente o identifica la unidad con placas o marca y modelo.",
    );

    await user.type(screen.getByLabelText("Placas (opcional)"), "ABC-123");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("heading", { name: "Conceptos", level: 2 })).toBeInTheDocument();
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
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("maxlength", "20");
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

  it("portals the anchored results outside form flow and closes on click-away", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.click(search);
    const listbox = screen.getByRole("listbox", { name: /resultados de clientes/i });

    expect(listbox.parentElement).toBe(document.body);
    expect(listbox).toHaveClass("fixed", "z-[60]");
    expect(screen.getByTestId("quote-builder-scroll-area")).not.toContainElement(listbox);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(search).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("flips the results above and clamps their height when space below is insufficient", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    const search = screen.getByRole("combobox", { name: /cliente/i });
    vi.spyOn(search, "getBoundingClientRect").mockReturnValue({
      bottom: 590,
      height: 40,
      left: -20,
      right: 280,
      top: 550,
      width: 300,
      x: -20,
      y: 550,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerHeight", 600);
    vi.stubGlobal("innerWidth", 280);

    await user.click(search);
    const listbox = screen.getByRole("listbox", { name: /resultados de clientes/i });

    expect(listbox).toHaveStyle({ left: "8px", maxHeight: "224px", top: "322px", width: "264px" });

    vi.stubGlobal("innerHeight", 180);
    fireEvent.scroll(window);
    expect(listbox).toHaveStyle({ maxHeight: "164px", top: "8px" });
    expect(listbox).toHaveClass("overflow-y-auto", "overscroll-contain");
    vi.unstubAllGlobals();
  });

  it("requires a meaningful query and reuses identical cached searches", async () => {
    const user = userEvent.setup();
    const searchCustomersAction = vi.fn().mockResolvedValue([
      { id: "cust-remote", name: "Cliente remoto" },
    ]);
    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={searchCustomersAction}
      />,
    );

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.type(search, "c");
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    expect(searchCustomersAction).not.toHaveBeenCalled();

    await user.type(search, "liente remoto");
    expect(await screen.findByRole("option", { name: "Cliente remoto" })).toBeInTheDocument();
    expect(searchCustomersAction).toHaveBeenCalledTimes(1);

    await user.clear(search);
    await user.type(search, "cliente remoto");
    expect(await screen.findByRole("option", { name: "Cliente remoto" })).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    expect(searchCustomersAction).toHaveBeenCalledTimes(1);
  });

  it("restores the exact cached results and active customer when revisiting a query", async () => {
    vi.useFakeTimers();
    const queryAResults = [
      { id: "cust-a1", name: "Alpha Uno" },
      { id: "cust-a2", name: "Alpha Dos" },
    ];
    const queryBResults = [{ id: "cust-b", name: "Beta Uno" }];
    const searchCustomersAction = vi
      .fn()
      .mockResolvedValueOnce(queryAResults)
      .mockResolvedValueOnce(queryBResults);

    try {
      render(
        <QuoteBuilder
          customers={customers}
          createAction={vi.fn()}
          searchCustomersAction={searchCustomersAction}
        />,
      );
      const search = screen.getByRole("combobox", { name: /cliente/i });

      fireEvent.change(search, { target: { value: "alpha" } });
      await act(() => vi.advanceTimersByTimeAsync(500));
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Alpha Uno",
        "Alpha Dos",
      ]);

      fireEvent.change(search, { target: { value: "beta" } });
      await act(() => vi.advanceTimersByTimeAsync(500));
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Beta Uno"]);

      fireEvent.change(search, { target: { value: "alpha" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(501);
        await Promise.resolve();
      });

      expect(searchCustomersAction).toHaveBeenCalledTimes(2);
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Alpha Uno",
        "Alpha Dos",
      ]);
      expect(search).toHaveAttribute("aria-activedescendant", "customer-option-cust-a1");

      fireEvent.keyDown(search, { key: "Enter" });
      expect(search).toHaveValue("Alpha Uno");
      expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-a1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("filters known customers immediately while a prefix server fallback is debounced", async () => {
    const user = userEvent.setup();
    const searchCustomersAction = vi.fn().mockResolvedValue(customers);
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} searchCustomersAction={searchCustomersAction} />);

    const search = screen.getByRole("combobox", { name: /cliente/i });
    await user.type(search, "con");

    expect(screen.getByRole("option", { name: "Constructora del Norte" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Taller Hermanos Pérez" })).not.toBeInTheDocument();
    expect(searchCustomersAction).not.toHaveBeenCalled();
    await waitFor(() => expect(searchCustomersAction).toHaveBeenCalledWith({ query: "con" }));
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

  it("ignores a late search response after the query is shortened below the minimum", async () => {
    const user = userEvent.setup();
    const pendingSearch = deferred<Array<{ id: string; name: string }>>();
    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={vi.fn().mockReturnValue(pendingSearch.promise)}
      />,
    );
    const search = screen.getByRole("combobox", { name: /cliente/i });

    await user.type(search, "remoto");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Buscando clientes..."));
    await user.clear(search);
    await user.type(search, "r");
    pendingSearch.resolve([{ id: "cust-late", name: "Respuesta tardía" }]);

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(search).toHaveValue("r");
    expect(screen.queryByRole("option", { name: "Respuesta tardía" })).not.toBeInTheDocument();
  });

  it("ignores a late search error after the query is cleared", async () => {
    const user = userEvent.setup();
    const pendingSearch = deferred<Array<{ id: string; name: string }>>();
    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        searchCustomersAction={vi.fn().mockReturnValue(pendingSearch.promise)}
      />,
    );
    const search = screen.getByRole("combobox", { name: /cliente/i });

    await user.type(search, "falla");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Buscando clientes..."));
    await user.clear(search);
    pendingSearch.reject(new Error("Unavailable"));

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(search).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Constructora del Norte" })).toBeInTheDocument();
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
          discountCents: 0,
          sections: [{ name: "", items: [] }],
        }}
      />,
    );

    expect(screen.getByRole("combobox", { name: /cliente/i })).toHaveValue("Cliente histórico");
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-old");
  });

  it("keeps the operational date read-only outside DRAFT while preserving it for form submission", () => {
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
          discountCents: 0,
          operationalDate: "2026-07-14",
          isOperationalDateEditable: false,
          sections: [{ name: "", items: [] }],
        }}
      />,
    );

    expect(screen.getByLabelText("Fecha de cotización")).toBeDisabled();
    expect(document.querySelector('input[type="hidden"][name="operationalDate"]')).toHaveValue("2026-07-14");
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
    expect(screen.getByRole("button", { name: "Siguiente" })).not.toBeDisabled();
  });

  it("submits through the native final form action with the expected FormData", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("heading", { name: "Revisar y enviar cotización", level: 2 })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Servicio general" })).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();

    const form = screen.getByTestId("quote-builder-form");
    fireEvent.submit(form);
    expect(action).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = action.mock.calls[0][1] as FormData;
    const entries = Object.fromEntries(formData.entries());

    expect(entries.customerId).toBe("cust-1");
    expect(entries.title).toBe("Servicio general");
    expect(entries.operationalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entries["sections.0.items.0.description"]).toBe("Cambio de aceite");
    expect(entries["sections.0.items.0.quantity"]).toBe("1");
    expect(entries["sections.0.items.0.unitPrice"]).toBe("850");
    expect(entries["sections.0.items.0.type"]).toBe("LABOR");
    expect(entries["sections.0.items.1.type"]).toBeUndefined();
    expect([...formData.keys()].some((key) => key.toLowerCase().includes("rowid"))).toBe(false);
    const conceptDescriptions = screen.getAllByText("Cambio de aceite");
    // 1 hidden summary row in the items step + 2 visible preview surfaces:
    // the desktop table and the mobile compact item cards (both in the DOM).
    expect(conceptDescriptions).toHaveLength(3);
    expect(conceptDescriptions.filter((description) => !description.closest("[hidden]"))).toHaveLength(2);
  }, 10_000);

  it("allows draft submission with a missing price without displaying a false zero", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ success: true });

    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Precio por confirmar");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByTestId("concept-total-0")).toHaveTextContent("Pendiente");
    expect(screen.getByTestId("concept-total-0")).not.toHaveTextContent("$0.00");

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect((action.mock.calls[0][1] as FormData).get("sections.0.items.0.unitPrice")).toBe("");
  });

  it("blocks a commercial transition when a complete concept has no price", () => {
    expect(
      getStepError("items", {
        customerId: "cust-1",
        vehicle: { plate: "", brand: "Ford", model: "F-150" },
        title: "Servicio",
        sections: [{ name: "General", items: [{ type: "LABOR", description: "Trabajo", quantity: "1", unitPrice: "" }], rowIds: ["row-1"] }],
      }, true),
    ).toBe("El concepto 1 necesita un precio unitario.");
  });

  it("preserves edited customer, concept, and preview step after a failed save", async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn().mockResolvedValue({ error: "No se pudo guardar." });
    render(
      <QuoteBuilder
        customers={customers}
        saveAction={saveAction}
        initialData={{
          customerId: "cust-1",
          vehicle: { plate: "ABC-123", brand: "Ford", model: "F-150", year: "2022" },
          title: "Afinación original",
          description: "Notas originales",
          administrative: false,
          taxEnabled: true,
          discountCents: 0,
          sections: [{ name: "", items: [{ type: "LABOR", description: "Afinación", quantity: "1", unitPrice: "1200" }] }],
        }}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: /cliente/i }));
    await user.click(screen.getByRole("option", { name: "Taller Hermanos Pérez" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    const descriptionInput = document.querySelector('input[name="sections.0.items.0.description"]') as HTMLInputElement;
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Afinación mayor");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
    expect(screen.getByRole("heading", { name: "Afinación original" })).toBeInTheDocument();
    expect(document.querySelector('input[name="customerId"]')).toHaveValue("cust-2");
    expect(document.querySelector('input[name="sections.0.items.0.description"]')).toHaveValue("Afinación mayor");

    await user.click(screen.getByRole("button", { name: "Paso 2: Conceptos" }));
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "   ");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText(/concepto 1 necesita una descripción/i)).toBeInTheDocument();
    expect(screen.getByText("No se pudo guardar.")).toBeInTheDocument();

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Afinación corregida");

    expect(screen.queryByText(/concepto 1 necesita una descripción/i)).not.toBeInTheDocument();
    expect(screen.getByText("No se pudo guardar.")).toBeInTheDocument();
  });

  it.each([
    ["Mano de obra", "LABOR"],
    ["Refacciones", "REFACCIONES"],
    ["Materiales", "MATERIAL"],
  ])("adds %s directly with type %s", async (label, type) => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();

    await user.click(screen.getByRole("button", { name: new RegExp(`Agregar ${label} a la sección`)}));

    expect(document.querySelector('input[name="sections.0.items.1.type"]')).toHaveValue(type);
  });

  it("renders compact add labels only below the responsive breakpoint", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const laborButton = screen.getByRole("button", { name: /Agregar Mano de obra a la sección/ });
    const partsButton = screen.getByRole("button", { name: /Agregar Refacciones a la sección/ });
    const materialsButton = screen.getByRole("button", { name: /Agregar Materiales a la sección/ });

    expect(laborButton.querySelector("span.sm\\:hidden")).toHaveTextContent("+ M. O.");
    expect(laborButton.querySelector("span.hidden.sm\\:inline")).toHaveTextContent("+ Mano de obra");
    expect(partsButton.querySelector("span.sm\\:hidden")).toHaveTextContent("+ Refac.");
    expect(partsButton.querySelector("span.hidden.sm\\:inline")).toHaveTextContent("+ Refacciones");
    expect(materialsButton.querySelector("span.sm\\:hidden")).toHaveTextContent("+ Mat.");
    expect(materialsButton.querySelector("span.hidden.sm\\:inline")).toHaveTextContent("+ Materiales");
    expect(materialsButton).toHaveAccessibleName("Agregar Materiales a la sección 1");
    expect(materialsButton).toHaveAttribute("title", "Materiales");
  });

  it.each([
    ["Otro", "OTHER"],
  ])("adds %s from the ⋯ popover with type %s", async (label, type) => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();

    await user.click(screen.getByRole("button", { name: "Más tipos de concepto" }));
    await user.click(screen.getByRole("menuitem", { name: `+ ${label}` }));

    expect(document.querySelector('input[name="sections.0.items.1.type"]')).toHaveValue(type);
  });

  it("aligns the other concept menu to the trigger's right edge", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    const trigger = screen.getByRole("button", { name: "Más tipos de concepto" });

    await user.click(trigger);

    const menu = screen.getByRole("menu", { name: "Otros tipos de concepto" });
    expect(menu).toHaveClass("right-0");
    expect(menu).not.toHaveClass("left-0");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("shows an always-visible delete icon in the collapsed row on desktop", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();

    const deleteButton = screen.getByRole("button", { name: "Eliminar concepto 1" });
    expect(deleteButton).toBeInTheDocument();
    // The base Button component injects `inline-flex`, which conflicts with the
    // breakpoint `hidden`. This icon must NOT carry a conflicting display that
    // would make it visible on mobile. It should only be inline-flex at sm+.
    expect(deleteButton).toHaveClass("hidden");
    expect(deleteButton).toHaveClass("sm:inline-flex");
  });

  it("renders the section name as title text without an input box", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();

    const nameInput = screen.getByLabelText("Nombre de la sección 1");
    expect(nameInput).toBeInstanceOf(HTMLInputElement);
    expect(nameInput).toHaveClass("bg-transparent");
    expect(nameInput.className).not.toMatch(/\bborder\b/);
    expect(nameInput.className).not.toMatch(/shadow/);
  });

  it("computes and displays the running total", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();

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

  it("keeps the next button available on the first draft step", async () => {
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    const nextButton = screen.getByRole("button", { name: "Siguiente" });
    expect(nextButton).not.toBeDisabled();

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

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = action.mock.calls[0][1] as FormData;
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

  it("allows draft navigation with an invalid price for later commercial validation", async () => {
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

    expect(screen.getByRole("heading", { name: "Notas", level: 2 })).toBeInTheDocument();
  });

  it("clamps quantity input to a maximum of 100 on blur", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await user.click(screen.getByRole("combobox", { name: "Tipo del concepto 1" }));
    await user.click(screen.getByRole("option", { name: "Material" }));

    const [quantityInput] = screen.getAllByLabelText(/cantidad/i);

    await user.clear(quantityInput);
    await user.type(quantityInput, "101");
    await user.tab();

    expect(quantityInput).toHaveValue("100");
  });

  it("clamps LABOR quantity to a maximum of 5 on blur", async () => {
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

  it("blurs the unit price during wheel capture without preventing page scrolling", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const unitPriceInput = screen.getByLabelText("Precio unitario");
    await user.type(unitPriceInput, "850");
    unitPriceInput.focus();

    expect(fireEvent.wheel(unitPriceInput)).toBe(true);
    expect(unitPriceInput).not.toHaveFocus();
    expect(unitPriceInput).toHaveValue(850);
  });

  it("allows draft navigation when a price exceeds the commercial limit", async () => {
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

    expect(screen.getByRole("heading", { name: "Notas", level: 2 })).toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: /Agregar Mano de obra a la sección/ }));

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

  it("allows advancing a draft when only description and quantity are filled", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    await user.type(descriptionInput, "Solo descripción");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("heading", { name: "Notas", level: 2 })).toBeInTheDocument();
  });

  it("clears the missing-concept error as soon as a draft concept is entered", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa al menos un concepto completo.");

    const [descriptionInput] = screen.getAllByLabelText(/descripción/i);
    await user.type(descriptionInput, "Cambio de aceite");

    expect(screen.queryAllByRole("alert").filter((alert) => alert.id.endsWith("-error"))).toHaveLength(0);
    expect(screen.queryByText(/necesita un precio unitario/i)).not.toBeInTheDocument();
  });

  it("keeps and then clears the missing-title error as the title becomes valid", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el título de la cotización.");

    const titleInput = screen.getByLabelText("Título");
    await user.type(titleInput, "   ");

    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa el título de la cotización.");

    await user.type(titleInput, "Servicio general");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not dispatch form submits without the final action click", async () => {
    const action = vi.fn();
    render(<QuoteBuilder customers={customers} createAction={action} />);

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    expect(action).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not dispatch a programmatic submit from the final review", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    fireEvent.submit(screen.getByTestId("quote-builder-form"));

    expect(action).not.toHaveBeenCalled();
  });

  it("blocks native final submission when local item validation fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const descriptionInput = document.querySelector('input[name="sections.0.items.0.description"]') as HTMLInputElement;
    fireEvent.change(descriptionInput, {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/concepto 1 necesita una descripción/i);
  });

  it("lets the user disable IVA and updates the total", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillItemsStep(user)();
    await user.click(screen.getByRole("checkbox", { name: /incluir iva/i }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const totals = screen.getAllByTestId("quote-total");
    expect(totals[0]).toHaveTextContent("$850.00");

    const taxes = screen.getAllByTestId("quote-tax");
    expect(taxes[0]).toHaveTextContent("$0.00");

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = action.mock.calls[0][1] as FormData;
    expect(formData.get("taxEnabled")).toBe("off");
  });

  it("preserves discount and payroll fields in native FormData order", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("combobox", { name: "Tipo del concepto 1" }));
    await user.click(screen.getByRole("option", { name: "Otro" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("checkbox", { name: "Incluir en nómina / comisión" }));
    await user.clear(screen.getByRole("spinbutton", { name: "Porcentaje de comisión" }));
    await user.type(screen.getByRole("spinbutton", { name: "Porcentaje de comisión" }), "35");
    await user.type(screen.getByLabelText("Descuento Global (Opcional)"), "100");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][1] as FormData;
    expect(formData.get("sections.0.items.0.includeInPayroll")).toBe("on");
    expect(formData.get("sections.0.items.0.customRatePercent")).toBe("35");
    expect(formData.get("discount")).toBe("100");
    expect(formData.get("taxEnabled")).toBe("on");
    expect([...formData.keys()]).toEqual([
      "customerId",
      "customerContactId",
      "customerFiscalProfileId",
      "plate",
      "economicNumber",
      "brand",
      "model",
      "year",
      "sections.0.name",
      "sections.0.items.0.type",
      "sections.0.items.0.description",
      "sections.0.items.0.quantity",
      "sections.0.items.0.unitPrice",
      "sections.0.items.0.includeInPayroll",
      "sections.0.items.0.customRatePercent",
      "taxEnabled",
      "discount",
      "title",
      "operationalDate",
      "description",
    ]);
  }, 10_000);

  it("shows the validity note in the preview step", async () => {
    const user = userEvent.setup();

    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
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
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
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
    expect(descriptions[1]).toHaveFocus();

    const duplicatedRow = screen.getByTestId("concept-row-1");
    expect(scrollIntoView.mock.instances.at(-1)).toBe(duplicatedRow);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "nearest" });
    expect(duplicatedRow).toHaveClass("motion-safe:animate-fade-in", "motion-safe:animate-duration-200");

    const quantities = Array.from(document.querySelectorAll('input[name$=".quantity"]'));
    expect(quantities[1]).toHaveValue("3");

    const unitPrices = Array.from(document.querySelectorAll('input[name$=".unitPrice"]'));
    expect(unitPrices[1]).toHaveValue(850);

    expect(document.querySelector('input[name="sections.0.items.1.type"]')).toHaveValue("LABOR");
    expect(document.querySelector('[name*="rowId"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar concepto 1" }));
    expect(screen.getByTestId("concept-row-0")).toBe(duplicatedRow);
    expect(document.querySelector('input[name="sections.0.items.0.description"]')).toHaveValue("Cambio de aceite");
    scrollIntoView.mockRestore();
  });

  it("adds a row and scrolls to and focuses the exact new row", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de aceite");
    await user.click(screen.getByRole("button", { name: /Agregar Materiales a la sección/ }));

    const descriptions = screen.getAllByLabelText("Descripción", { selector: "input" });
    const newRow = screen.getByTestId("concept-row-1");
    expect(descriptions).toHaveLength(2);
    expect(descriptions[1]).toHaveFocus();
    expect(document.querySelector('input[name="sections.0.items.1.type"]')).toHaveValue("MATERIAL");
    expect(scrollIntoView.mock.instances.at(-1)).toBe(newRow);
    expect(newRow).toHaveClass("motion-safe:animate-fade-in", "motion-safe:animate-duration-200");
    scrollIntoView.mockRestore();
  });

  it("keeps incomplete concepts compact with a pending summary and restores their values", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Precio por confirmar");

    expect(screen.queryByText("1 completos")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("concept-summary-0"));

    const firstSummary = screen.getByTestId("concept-summary-0");
    expect(firstSummary).toHaveTextContent("Precio por confirmar");
    expect(firstSummary).toHaveTextContent("Pendiente: precio");
    expect(firstSummary).not.toHaveTextContent("$0.00");
    expect(document.getElementById("concept-editor-quote-item-0")).toHaveAttribute("hidden");

    await user.click(screen.getByTestId("concept-summary-0"));

    expect(document.getElementById("concept-editor-quote-item-0")).not.toHaveAttribute("hidden");
    expect(screen.getByLabelText("Descripción", { selector: "input" })).toHaveValue("Precio por confirmar");
    expect(screen.getByLabelText("Precio unitario")).toHaveValue(null);
  });

  it("prioritizes compact summary content and keeps secondary actions accessible", async () => {
    const user = userEvent.setup();
    render(
      <QuoteBuilder
        customers={customers}
        createAction={vi.fn()}
        initialData={{
          customerId: "cust-1",
          vehicle: { plate: "", brand: "", model: "", year: "" },
          title: "Concepto compacto",
          description: "",
          administrative: false,
          taxEnabled: true,
          discountCents: 0,
          sections: [{ name: "", items: [{ type: "LABOR", description: "cambio de aceite", quantity: "1", unitPrice: "850" }] }],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const summary = screen.getByTestId("concept-summary-0");

    expect(summary).toHaveTextContent("Cambio de aceite");
    expect(summary).toHaveTextContent("1 unidad");
    expect(summary).toHaveTextContent("Mano de obra");
    expect(document.querySelector('input[name="sections.0.items.0.description"]')).toHaveValue("cambio de aceite");
    expect(screen.getByRole("button", { name: "Reordenar concepto 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicar concepto 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acciones de concepto 1" })).not.toBeInTheDocument();
  });

  it("opens and focuses each new concept without blocking an incomplete prior concept", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Diagnóstico pendiente");

    await user.click(screen.getByRole("button", { name: /Agregar Materiales a la sección/ }));

    expect(document.getElementById("concept-editor-quote-item-0")).toHaveAttribute("hidden");
    expect(document.getElementById("concept-editor-quote-item-1")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("concept-summary-0")).toHaveTextContent("Pendiente: precio");
    expect(document.querySelector('input[name="sections.0.items.1.description"]')).toHaveFocus();
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
    expect(screen.getAllByText("Importe")[0]).toBeInTheDocument();
    expect(screen.getByTestId("currency-prefix-0")).toHaveTextContent("$");
    expect(screen.getByTestId("concept-total-0")).toHaveTextContent("$850.00");
    expect(quantityPriceRow.parentElement).not.toHaveTextContent("1 × $850.00");
    expect(screen.getByRole("button", { name: /Agregar Materiales a la sección/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar Refacciones a la sección/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar Mano de obra a la sección/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más tipos de concepto" })).toBeInTheDocument();
  });

  it("renders the final preview after the notes step", async () => {
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

    expect(screen.getByTestId("preview-customer-icon")).toBeInTheDocument();
    expect(screen.getByTestId("preview-vehicle-icon")).toBeInTheDocument();
    // Concepts must be visible in the review step on every breakpoint: the
    // compact item cards render the filled concept even when the table is
    // hidden on mobile.
    expect(screen.getByTestId("quote-compact-items")).toBeInTheDocument();
    expect(screen.getAllByText("Cambio de aceite").length).toBeGreaterThan(0);
    expect(screen.getByTestId("quote-items-table")).toBeInTheDocument();
  });

  it("keeps inactive item error slots stable and preserves price currency help", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const description = screen.getByLabelText("Descripción", { selector: "input" });
    const quantity = screen.getByLabelText("Cantidad");
    const unitPrice = screen.getByLabelText("Precio unitario");

    for (const errorId of [
      "sections-0-items-0-description-error",
      "sections-0-items-0-quantity-error",
      "sections-0-items-0-unitPrice-error",
    ]) {
      const errorSlot = document.getElementById(errorId);
      expect(errorSlot).toBeEmptyDOMElement();
      expect(errorSlot).toHaveClass("min-h-4", "text-xs");
      expect(errorSlot).not.toHaveAttribute("role");
    }

    expect(description).not.toHaveAttribute("aria-invalid");
    expect(description).not.toHaveAttribute("aria-describedby");
    expect(quantity).not.toHaveAttribute("aria-invalid");
    expect(quantity).not.toHaveAttribute("aria-describedby");
    expect(unitPrice).not.toHaveAttribute("aria-invalid");
    expect(unitPrice).toHaveAttribute(
      "aria-describedby",
      "sections-0-items-0-unitPrice-currency",
    );
    expect(unitPrice).toHaveAccessibleDescription("Importe en pesos mexicanos.");
  });

  it("shows item field errors immediately and clears each one after correction", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const description = screen.getByLabelText("Descripción", { selector: "input" });
    const quantity = screen.getByLabelText("Cantidad");
    const unitPrice = screen.getByLabelText("Precio unitario");

    await user.type(description, "Cambio de aceite");
    expect(screen.queryByText("El concepto 1 necesita un precio unitario.")).not.toBeInTheDocument();
    expect(unitPrice).not.toHaveAttribute("aria-invalid");
    expect(unitPrice).toHaveAttribute("aria-describedby", "sections-0-items-0-unitPrice-currency");

    await user.clear(quantity);
    expect(document.getElementById("sections-0-items-0-quantity-error")).toHaveTextContent(
      "El concepto 1 necesita una cantidad.",
    );
    expect(quantity).toHaveAttribute("aria-invalid", "true");
    expect(quantity).toHaveAttribute("aria-describedby", "sections-0-items-0-quantity-error");

    await user.type(quantity, "2");
    expect(document.getElementById("sections-0-items-0-quantity-error")).toBeEmptyDOMElement();
    expect(quantity).not.toHaveAttribute("aria-invalid");

    await user.clear(description);
    expect(screen.getByRole("alert")).toHaveTextContent("El concepto 1 necesita una descripción.");
    expect(description).toHaveAttribute("aria-invalid", "true");

    await user.type(description, "Cambio de aceite corregido");
    expect(document.getElementById("sections-0-items-0-description-error")).toBeEmptyDOMElement();
    expect(description).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(unitPrice, { target: { value: "-5" } });
    expect(document.getElementById("sections-0-items-0-unitPrice-error")).toHaveTextContent(
      "El precio unitario del concepto 1 no puede ser negativo.",
    );
    expect(unitPrice).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("concept-total-0")).toHaveTextContent("Pendiente");

    await user.clear(unitPrice);
    await user.type(unitPrice, "5");
    expect(document.getElementById("sections-0-items-0-unitPrice-error")).toBeEmptyDOMElement();
    expect(unitPrice).not.toHaveAttribute("aria-invalid");
  });

  it("rejects placeholder item descriptions and titles until they are corrected", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const description = screen.getByLabelText("Descripción", { selector: "input" });
    await user.type(description, "...");
    expect(screen.getByRole("alert")).toHaveTextContent("La descripción del concepto 1 debe incluir texto significativo.");
    await user.clear(description);
    await user.type(description, "Cambio de aceite");
    expect(document.getElementById("sections-0-items-0-description-error")).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    const title = screen.getByLabelText("Título");
    await user.type(title, "xyz");
    expect(screen.getByRole("alert")).toHaveTextContent("El título debe incluir texto significativo.");
    await user.clear(title);
    await user.type(title, "Servicio general");
    expect(document.getElementById("quote-title-error")).toBeEmptyDOMElement();
  });

  it("revalidates items in the final action before calling the server action", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const description = document.querySelector('input[name="sections.0.items.0.description"]') as HTMLInputElement;
    fireEvent.change(description, { target: { value: "" } });

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Paso 2: Conceptos" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("El concepto 1 necesita una descripción.")).toBeInTheDocument();
  });

  it("keeps a server failure global while an item field is corrected", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ error: "No se pudo guardar." });
    render(<QuoteBuilder customers={customers} createAction={action} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillItemsStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await fillNotesStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");

    await user.click(screen.getByRole("button", { name: "Paso 2: Conceptos" }));
    const description = screen.getByLabelText("Descripción", { selector: "input" });
    await user.clear(description);
    expect(screen.getByText("El concepto 1 necesita una descripción.")).toBeInTheDocument();
    expect(screen.getByText("No se pudo guardar.")).toBeInTheDocument();

    await user.type(description, "Cambio de aceite corregido");
    expect(screen.queryByText("El concepto 1 necesita una descripción.")).not.toBeInTheDocument();
    expect(screen.getByText("No se pudo guardar.")).toBeInTheDocument();
  });

  it("verifies compound control structure, border and focus ownership, separators, and accessible states for quantity and unit price (issue #475)", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);

    await fillClientStep(user)();
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    // 1. Structural ownership of borders and focus
    const quantityInput = screen.getByLabelText("Cantidad");
    const unitPriceInput = screen.getByLabelText("Precio unitario");
    const quantityContainer = quantityInput.parentElement!;
    const unitPriceContainer = unitPriceInput.parentElement!;

    // Outer containers own the continuous border and focus ring
    expect(quantityContainer).toHaveClass("border", "border-[var(--color-border-light)]");
    expect(quantityContainer).toHaveClass("focus-within:ring-[3px]", "focus-within:ring-[var(--color-focus-ring)]");
    expect(quantityContainer).not.toHaveClass("overflow-hidden");

    expect(unitPriceContainer).toHaveClass("border", "border-[var(--color-border-light)]");
    expect(unitPriceContainer).toHaveClass("focus-within:ring-[3px]", "focus-within:ring-[var(--color-focus-ring)]");

    // Inner inputs do not own outer border or competing focus ring
    expect(quantityInput).toHaveClass("outline-none", "bg-transparent", "px-1");
    expect(quantityInput).not.toHaveClass("border", "shadow-sm");

    expect(unitPriceInput).toHaveClass("outline-none", "bg-transparent");
    expect(unitPriceInput).not.toHaveClass("border", "shadow-sm");

    // Currency prefix
    const currencyPrefix = screen.getByTestId("currency-prefix-0");
    expect(currencyPrefix).toHaveTextContent("$");
    expect(unitPriceContainer).toContainElement(currencyPrefix);
    expect(unitPriceInput).toHaveAccessibleDescription("Importe en pesos mexicanos.");

    // 2. Internal separators on buttons without double borders
    const minusButton = screen.getByRole("button", { name: "Restar cantidad del concepto 1" });
    const plusButton = screen.getByRole("button", { name: "Sumar cantidad del concepto 1" });

    expect(minusButton).toHaveClass("border-r", "border-[var(--color-border-light)]");
    expect(minusButton).not.toHaveClass("border-l", "border-t", "border-b");

    expect(plusButton).toHaveClass("border-l", "border-[var(--color-border-light)]");
    expect(plusButton).not.toHaveClass("border-r", "border-t", "border-b");

    // 3. Disabled states
    // Default quantity is 1 -> minus button disabled
    expect(minusButton).toBeDisabled();
    expect(plusButton).not.toBeDisabled();

    // Increment with plus button
    await user.click(plusButton);
    expect(quantityInput).toHaveValue("2");
    expect(minusButton).not.toBeDisabled();

    // Set quantity to maximum for default LABOR (limit = 100)
    await user.clear(quantityInput);
    await user.type(quantityInput, "100");
    expect(plusButton).toBeDisabled();

    // 4. Error states and accessibility
    // Clear quantity to empty -> triggers invalid state
    await user.clear(quantityInput);
    expect(quantityInput).toHaveAttribute("aria-invalid", "true");
    const quantityErrorId = quantityInput.getAttribute("aria-describedby");
    expect(quantityErrorId).toBeTruthy();
    expect(document.getElementById(quantityErrorId!)).toHaveTextContent("El concepto 1 necesita una cantidad.");
  });
});
