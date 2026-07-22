import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

const customers = [{ id: "1", name: "Acme" }];
const editInitialData = { customerId: "1", vehicle: { plate: "ABC123", brand: "Ford", model: "Transit", year: "2024" }, title: "Servicio", description: "", administrative: false, taxEnabled: true, items: [{ type: "LABOR" as const, description: "Frenos", quantity: "1", unitPrice: "100" }] };

function expectStableDialogLayout(dialog: HTMLElement, overflowing: boolean) {
  const dialogStyle = getComputedStyle(dialog);
  expect(dialogStyle.display).toBe("flex");
  expect(dialogStyle.flexDirection).toBe("column");
  expect(dialogStyle.alignItems).toBe("stretch");
  expect(dialogStyle.justifyContent).toBe("flex-start");
  expect(dialogStyle.overflow).toBe("hidden");

  const header = screen.getByRole("heading", { name: /cotización/ }).parentElement;
  const form = screen.getByTestId("quote-builder-form");
  const stepper = screen.getByRole("navigation", { name: "Pasos de cotización" }).parentElement;
  const body = screen.getByTestId("quote-builder-scroll-area");
  const footer = screen.getByTestId("quote-builder-footer");

  expect(header).not.toBeNull();
  expect(stepper).not.toBeNull();
  expect(Array.from(dialog.children)).toEqual([header, form]);
  expect(Array.from(form.children)).toEqual([stepper, body, footer]);
  expect(getComputedStyle(form).justifyContent).toBe("flex-start");
  expect(getComputedStyle(form).minHeight).toBe("0px");

  for (const fixedRegion of [header!, stepper!, footer]) {
    const style = getComputedStyle(fixedRegion);
    expect(style.flexShrink).toBe("0");
    expect(style.overflowY).not.toBe("auto");
  }

  const bodyStyle = getComputedStyle(body);
  expect(bodyStyle.flexGrow).toBe("1");
  expect(bodyStyle.flexShrink).toBe("1");
  expect(bodyStyle.minHeight).toBe("0px");
  expect(bodyStyle.overflowY).toBe("auto");
  expect(bodyStyle.overscrollBehaviorY).toBe("contain");

  Object.defineProperties(body, {
    clientHeight: { configurable: true, value: 320 },
    scrollHeight: { configurable: true, value: overflowing ? 960 : 240 },
  });
  expect(body.scrollHeight > body.clientHeight).toBe(overflowing);
}

async function enterRepresentativeQuoteState(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Cliente" }));
  await user.click(await screen.findByRole("option", { name: "Acme" }));
  await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "ABC123");
  await user.type(screen.getByRole("textbox", { name: "Marca (opcional)" }), "Ford");
  await user.type(screen.getByRole("textbox", { name: "Modelo (opcional)" }), "Transit");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de frenos");
  await user.clear(screen.getByRole("textbox", { name: "Cantidad" }));
  await user.type(screen.getByRole("textbox", { name: "Cantidad" }), "3");
  await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "1250");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await user.type(screen.getByRole("textbox", { name: "Título" }), "Servicio completo");
  await user.type(screen.getByLabelText("Descripción", { selector: "textarea" }), "Trabajo prioritario");
  await user.click(screen.getByRole("checkbox", { name: "Cotización administrativa" }));
  await user.click(screen.getByRole("checkbox", { name: "Incluir IVA (16%)" }));
}

function expectRepresentativeQuoteState() {
  expect(screen.getByRole("button", { name: "Paso 3: Notas" })).toHaveAttribute("aria-current", "step");
  expect(screen.getByLabelText("Cliente")).toHaveValue("Acme");
  expect(screen.getByLabelText("Placas (opcional)")).toHaveValue("ABC123");
  expect(screen.getByLabelText("Marca (opcional)")).toHaveValue("Ford");
  expect(screen.getByLabelText("Modelo (opcional)")).toHaveValue("Transit");
  expect(screen.getByLabelText("Descripción", { selector: "input" })).toHaveValue("Cambio de frenos");
  expect(screen.getByLabelText("Cantidad")).toHaveValue("3");
  expect(screen.getByLabelText("Precio unitario")).toHaveValue(1250);
  expect(screen.getByLabelText("Título")).toHaveValue("Servicio completo");
  expect(screen.getByLabelText("Descripción", { selector: "textarea" })).toHaveValue("Trabajo prioritario");
  expect(screen.getByLabelText("Cotización administrativa")).toBeChecked();
  expect(screen.getByLabelText("Incluir IVA (16%)")).not.toBeChecked();
}

describe("QuoteBuilderDialog", () => {
  it.each([
    ["short", 1],
    ["long", 12],
  ])("keeps chrome fixed and content top-aligned for a %s step", async (_, itemCount) => {
    const user = userEvent.setup();
    const items = Array.from({ length: itemCount }, (__, index) => ({
      type: "LABOR" as const,
      description: `Concept ${index + 1}`,
      quantity: "1",
      unitPrice: "100",
    }));
    render(
      <QuoteBuilderDialog
        customers={customers}
        initialData={{ ...editInitialData, items }}
        quoteNumber="C-001"
        saveAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = screen.getByRole("dialog", { name: "Editar cotización C-001" });
    expectStableDialogLayout(dialog, itemCount > 1);
    expect(screen.getAllByLabelText("Descripción", { selector: "input" })).toHaveLength(itemCount);
    expect(screen.getByTestId("concept-list")).toHaveClass("grid", "gap-3");
    expect(screen.getByTestId("concept-list")).not.toHaveClass("max-h-[45dvh]", "overflow-y-auto");
  });

  it("requests confirmation via the X button", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Crear cotización" })).toBeInTheDocument();
    expect(dialog).toHaveClass(
      "!inset-0",
      "!h-dvh",
      "!max-h-none",
      "!w-screen",
      "!max-w-none",
      "!translate-x-0",
      "!translate-y-0",
      "!rounded-none",
      "sm:!h-[min(90dvh,52rem)]",
      "sm:!max-h-[min(90dvh,52rem)]",
      "sm:!w-[min(92vw,64rem)]",
      "sm:!max-w-5xl",
      "sm:!rounded-[var(--radius-lg)]",
    );
    expectStableDialogLayout(dialog, false);
    expect(screen.queryByText(/crear cotización en borrador/i)).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "A");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
    expect(screen.getByText("Se perderá todo el progreso que no hayas guardado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeInTheDocument();
  });

  it("moves and contains focus in confirmation, hides the builder, and restores focus", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    const closeButton = screen.getByRole("button", { name: "Cerrar" });
    await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "A");
    await user.click(closeButton);

    const confirmation = screen.getByRole("dialog", { name: "¿Descartar la cotización?" });
    const hiddenBuilder = document.querySelector('[role="dialog"][aria-hidden="true"]');
    expect(hiddenBuilder).toHaveAttribute("data-state", "open");
    expect(confirmation).toContainElement(document.activeElement as HTMLElement);
    expect(hiddenBuilder).not.toContainElement(document.activeElement as HTMLElement);

    await user.tab();
    expect(confirmation).toContainElement(document.activeElement as HTMLElement);
    await user.tab();
    expect(confirmation).toContainElement(document.activeElement as HTMLElement);
    await user.tab({ shift: true });
    expect(confirmation).toContainElement(document.activeElement as HTMLElement);

    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(screen.getByRole("dialog", { name: "Crear cotización" })).not.toHaveAttribute("aria-hidden");
  });

  it("closes a pristine form immediately", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requests confirmation when clicking the overlay", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "A");

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).not.toBeNull();
    if (overlay instanceof HTMLElement) {
      await user.click(overlay);
    }

    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva cotización", hidden: true })).toHaveAttribute("aria-expanded", "true");
  });

  it("requests confirmation when pressing Escape", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "A");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva cotización", hidden: true })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps entered state when continuing to edit", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await enterRepresentativeQuoteState(user);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));

    expectRepresentativeQuoteState();
    expect(screen.queryByRole("dialog", { name: "¿Descartar la cotización?" })).not.toBeInTheDocument();
  });

  it("discards state and starts fresh when reopened", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await enterRepresentativeQuoteState(user);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Crear cotización" })).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("button", { name: "Paso 1: Cliente / Unidad" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByLabelText("Cliente")).not.toHaveValue("Acme");
    expect(screen.getByLabelText("Placas (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Marca (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Modelo (opcional)")).toHaveValue("");
    expect(screen.getByLabelText("Descripción", { selector: "input" })).toHaveValue("");
    expect(screen.getByLabelText("Cantidad")).toHaveValue("1");
    expect(screen.getByLabelText("Precio unitario")).toHaveValue(null);
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Descripción", { selector: "textarea" })).toHaveValue("");
    expect(screen.getByLabelText("Cotización administrativa")).not.toBeChecked();
    expect(screen.getByLabelText("Incluir IVA (16%)")).toBeChecked();
  });

  it("does not request close when selecting from portaled dropdowns", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Cliente" }));
    const option = await screen.findByRole("option", { name: "Acme" });
    expect(option.closest("[data-dialog-popover]")?.parentElement).toBe(document.body);
    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    const itemTypeSelect = screen.getAllByRole("combobox").find((element) => element.tagName === "BUTTON");
    expect(itemTypeSelect).toBeDefined();
    if (itemTypeSelect) {
      await user.click(itemTypeSelect);
    }
    await user.click(await screen.findByRole("option", { name: "Material" }));

    expect(screen.getByRole("dialog", { name: "Crear cotización" })).toHaveAttribute("data-state", "open");
    expect(screen.queryByRole("dialog", { name: "¿Descartar la cotización?" })).not.toBeInTheDocument();
  });

  it("opens edit with the existing state", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} saveAction={vi.fn()} quoteNumber="C-001" initialData={editInitialData} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("dialog", { name: "Editar cotización C-001" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cliente")).toHaveValue("Acme");
    expect(screen.getByLabelText("Placas (opcional)")).toHaveValue("ABC123");
  });

  it("submits edits, preserves them on failure, and resets after success", async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn().mockResolvedValueOnce({ error: "Error del servidor" }).mockResolvedValueOnce({ success: true });
    render(<QuoteBuilderDialog customers={customers} saveAction={saveAction} quoteNumber="C-001" initialData={editInitialData} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    const title = screen.getByRole("textbox", { name: "Título" });
    await user.clear(title);
    await user.type(title, "Servicio editado");
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction.mock.calls[0]?.[1]).toBeInstanceOf(FormData);
    expect(saveAction.mock.calls[0]?.[1].get("title")).toBe("Servicio editado");
    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
    expect(screen.getByRole("dialog", { name: "Editar cotización C-001" })).toBeInTheDocument();
    expect(title).toHaveValue("Servicio editado");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar cotización C-001" })).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Servicio");
  });

  it("closes on success and keeps state open on a server error", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn().mockResolvedValueOnce({ error: "Error del servidor" }).mockResolvedValueOnce({ success: true });
    render(<QuoteBuilderDialog customers={customers} createAction={createAction} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await enterRepresentativeQuoteState(user);
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
    expect(screen.getByLabelText("Título")).toHaveValue("Servicio completo");

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Crear cotización" })).not.toBeInTheDocument());
  });
});
