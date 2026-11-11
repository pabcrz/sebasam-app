import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const customers = [{ id: "1", name: "Acme" }];
// Full-screen quote flow: the bottom bar names the next step, e.g. "Conceptos →".
const NEXT_STEP = /→$/;
const editInitialData = { customerId: "1", vehicle: { plate: "ABC123", brand: "Ford", model: "Transit", year: "2024" }, title: "Servicio", description: "", administrative: false, taxEnabled: true, discountCents: 0, sections: [{ name: "", items: [{ type: "LABOR" as const, description: "Frenos", quantity: "1", unitPrice: "100" }] }] };

function expectStableDialogLayout(dialog: HTMLElement, overflowing: boolean) {
  const dialogStyle = getComputedStyle(dialog);
  expect(dialogStyle.display).toBe("flex");
  expect(dialogStyle.flexDirection).toBe("column");
  expect(dialogStyle.alignItems).toBe("stretch");
  expect(dialogStyle.justifyContent).toBe("flex-start");
  expect(dialogStyle.overflow).toBe("hidden");

  const header = screen.getByTestId("multi-step-dialog-header");
  const stepper = screen.getByTestId("multi-step-dialog-stepper");
  const body = screen.getByTestId("multi-step-dialog-body");
  const footer = screen.getByTestId("multi-step-dialog-footer");
  const footerHost = screen.getByTestId("quote-builder-footer-host");

  expect(Array.from(dialog.children)).toEqual([header, stepper, body, footer]);

  expect(header).toContainElement(screen.getByRole("heading", { name: /cotización/ }));
  expect(stepper).toContainElement(screen.getByRole("navigation", { name: "Pasos de cotización" }));
  expect(footer).toContainElement(screen.getByRole("button", { name: NEXT_STEP }));
  expect(footerHost).toHaveClass("contents");
  expect(footerHost.parentElement).toBe(footer);

  for (const fixedRegion of [header, stepper, footer]) {
    const style = getComputedStyle(fixedRegion);
    expect(style.flexShrink).toBe("0");
    expect(style.overflowY).not.toBe("auto");
  }

  const form = screen.getByTestId("quote-builder-form");
  expect(body).toContainElement(form);
  const scrollArea = screen.getByTestId("quote-builder-scroll-area");
  expect(Array.from(form.children)).toEqual([scrollArea]);
  const formStyle = getComputedStyle(form);
  expect(formStyle.display).toBe("flex");
  expect(formStyle.flexDirection).toBe("column");
  expect(formStyle.justifyContent).toBe("flex-start");
  expect(formStyle.height).toBe("100%");
  expect(formStyle.minHeight).toBe("0px");
  expect(formStyle.minWidth).toBe("0px");

  const bodyStyle = getComputedStyle(body);
  expect(bodyStyle.flexGrow).toBe("1");
  expect(bodyStyle.flexShrink).toBe("1");
  expect(bodyStyle.minHeight).toBe("0px");
  expect(bodyStyle.minWidth).toBe("0px");
  expect(bodyStyle.overflowY).toBe("auto");
  expect(bodyStyle.overscrollBehaviorY).toBe("contain");

  const scrollAreaStyle = getComputedStyle(scrollArea);
  expect(scrollAreaStyle.flexGrow).toBe("1");
  expect(scrollAreaStyle.flexShrink).toBe("1");
  expect(scrollAreaStyle.minHeight).toBe("0px");
  expect(scrollAreaStyle.minWidth).toBe("0px");
  expect(scrollAreaStyle.overflowY).toBe("auto");
  expect(scrollAreaStyle.overscrollBehaviorY).toBe("contain");

  Object.defineProperties(scrollArea, {
    clientHeight: { configurable: true, value: 320 },
    scrollHeight: { configurable: true, value: overflowing ? 960 : 240 },
  });
  expect(scrollArea.scrollHeight > scrollArea.clientHeight).toBe(overflowing);
}

function expectFullScreenQuoteDialog(dialog: HTMLElement) {
  expect(dialog).toHaveClass(
    "!inset-0",
    "!h-dvh",
    "!max-h-none",
    "!w-screen",
    "!max-w-none",
    "!rounded-none",
    "!gap-0",
    "p-0",
    "sm:!inset-0",
    "sm:!h-dvh",
    "sm:!w-screen",
    "sm:!max-w-none",
    "sm:!rounded-none",
    "sm:!p-0",
  );
  expect(dialog).not.toHaveClass("sm:!w-[min(92vw,64rem)]", "sm:!max-w-5xl", "sm:!rounded-[var(--radius-lg)]", "p-3");
}

function expectFullHeightQuoteBuilderDialog(dialog: HTMLElement) {
  expect(dialog).toHaveClass(
    "!h-dvh",
    "!max-h-none",
    "p-3",
    "sm:!h-dvh",
    "sm:!max-h-none",
    "sm:!p-3",
  );
  expect(dialog).not.toHaveClass("sm:!h-[calc(100dvh_-_1rem)]", "sm:!h-[min(90dvh,52rem)]");
}

async function enterRepresentativeQuoteState(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Cliente" }));
  await user.click(await screen.findByRole("option", { name: "Acme" }));
  await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "ABC123");
  await user.type(screen.getByRole("textbox", { name: "Marca (opcional)" }), "Ford");
  await user.type(screen.getByRole("textbox", { name: "Modelo (opcional)" }), "Transit");
  await user.click(screen.getByRole("button", { name: NEXT_STEP }));
  await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de frenos");
  await user.clear(screen.getByRole("textbox", { name: "Cantidad" }));
  await user.type(screen.getByRole("textbox", { name: "Cantidad" }), "3");
  await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "1250");
  await user.click(screen.getByRole("checkbox", { name: "Incluir IVA (16%)" }));
  await user.click(screen.getByRole("button", { name: NEXT_STEP }));
  await user.type(screen.getByRole("textbox", { name: "Título" }), "Servicio completo");
  await user.type(screen.getByLabelText("Descripción", { selector: "textarea" }), "Trabajo prioritario");
  await user.click(screen.getByRole("checkbox", { name: "Cotización administrativa" }));
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
  it("keeps the active-work edit trigger icon-only on mobile and labeled on desktop", () => {
    render(
      <QuoteBuilderDialog
        customers={customers}
        saveAction={vi.fn()}
        quoteNumber="C-001"
        initialData={editInitialData}
        triggerIconOnlyMobile
      />,
    );

    const edit = screen.getByRole("button", { name: "Editar cotización C-001" });
    expect(edit).toHaveAttribute("title", "Editar cotización C-001");
    expect(edit).toHaveClass("h-10", "w-10", "sm:h-9", "sm:w-auto");
    expect(edit.querySelector("span")).toHaveClass("sr-only", "sm:not-sr-only");
    expect(edit).toHaveTextContent("Editar");
  });

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
        initialData={{ ...editInitialData, sections: [{ name: "", items }] }}
        quoteNumber="C-001"
        saveAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));

    const dialog = screen.getByRole("dialog", { name: "Editar cotización C-001" });
    expectFullScreenQuoteDialog(dialog);
    expectStableDialogLayout(dialog, itemCount > 1);
    expect(screen.getAllByLabelText("Descripción", { selector: "input" })).toHaveLength(itemCount);
    expect(screen.getByTestId("concept-list-0")).toHaveClass("grid", "gap-3");
    expect(screen.getByTestId("concept-list-0")).not.toHaveClass("max-h-[45dvh]", "overflow-y-auto");
  });

  it("keeps dialog footer actions separated and shrinkable on the concepts step", async () => {
    const user = userEvent.setup();
    render(
      <QuoteBuilderDialog
        customers={customers}
        initialData={editInitialData}
        quoteNumber="C-001"
        saveAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));

    const footer = screen.getByTestId("multi-step-dialog-footer");
    const footerHost = screen.getByTestId("quote-builder-footer-host");
    const next = screen.getByRole("button", { name: "Notas →" });
    const back = screen.getByRole("button", { name: "Paso anterior" });

    expect(footer).toHaveClass("min-w-0", "flex-wrap", "items-center", "justify-between", "gap-3");
    expect(footerHost).toHaveClass("contents");
    expect(next.parentElement).toBe(footerHost);
    expect(footerHost).toContainElement(next);
    expect(footerHost).not.toContainElement(back);
    expect(screen.getByTestId("multi-step-dialog-header")).toContainElement(back);
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
  });

  it("requests confirmation via the X button", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Crear cotización" })).toBeInTheDocument();
    expectFullScreenQuoteDialog(dialog);
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
    const hiddenBuilder = screen.getByRole("dialog", { name: /Crear cotización/i, hidden: true });
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

    const trigger = screen.getByRole("button", { name: "Nueva cotización" });
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Crear cotización" });
    expect(screen.getByRole("button", { name: "Paso 1: Cliente y unidad" })).toHaveAttribute("aria-current", "step");
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
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));

    const itemTypeSelect = screen.getAllByRole("combobox").find((element) => element.tagName === "BUTTON");
    expect(itemTypeSelect).toBeDefined();
    if (itemTypeSelect) {
      await user.click(itemTypeSelect);
    }
    await user.click(await screen.findByRole("option", { name: "Material" }));

    expect(screen.getByRole("dialog", { name: "Crear cotización" })).toHaveAttribute("data-state", "open");
    expect(itemTypeSelect).toHaveTextContent("Material");
    expect(screen.queryByRole("option", { name: "Material" })).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));
    const title = screen.getByRole("textbox", { name: "Título" });
    await user.clear(title);
    await user.type(title, "Servicio editado");
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));
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
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Servicio");
  });

  it("closes on success and keeps state open on a server error", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn().mockResolvedValueOnce({ error: "Error del servidor" }).mockResolvedValueOnce({ success: true });
    refresh.mockClear();
    render(<QuoteBuilderDialog customers={customers} createAction={createAction} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await enterRepresentativeQuoteState(user);
    await user.click(screen.getByRole("button", { name: NEXT_STEP }));
    await user.click(screen.getByRole("button", { name: "Crear cotización" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Error del servidor");
    expect(screen.getByLabelText("Título")).toHaveValue("Servicio completo");

    await user.click(screen.getByRole("button", { name: "Crear cotización" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Crear cotización" })).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders direct work order title, button, master selector, and completed checkbox", async () => {
    const user = userEvent.setup();
    const createAction = vi.fn().mockResolvedValue({ success: true });
    const masters = [{ id: "m-1", displayName: "Maestro Pepe" }];

    render(
      <QuoteBuilderDialog
        customers={customers}
        createAction={createAction}
        mode="direct-work-order"
        masters={masters}
        triggerLabel="Agregar trabajo"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Agregar trabajo" });
    expect(trigger).toBeInTheDocument();
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Agregar trabajo" });
    expect(dialog).toBeInTheDocument();
    expectFullHeightQuoteBuilderDialog(dialog);
    expect(screen.getByLabelText("Maestro responsable *")).toBeInTheDocument();
    expect(screen.getByLabelText("Trabajo finalizado")).toBeInTheDocument();
  });

  it("uses the shared full-height desktop geometry for direct-note creation", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} mode="direct-note" />);

    await user.click(screen.getByRole("button", { name: "Nueva nota" }));

    const dialog = screen.getByRole("dialog", { name: "Nueva nota" });
    expectFullHeightQuoteBuilderDialog(dialog);
    expect(dialog).toHaveClass("!gap-0");
  });
});
