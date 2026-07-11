import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

const customers = [{ id: "1", name: "Acme" }];

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
  it("requests confirmation via the X button", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Crear cotización" })).toBeInTheDocument();
    expect(dialog).toHaveClass("h-[85dvh]", "overflow-hidden");
    expect(screen.queryByText(/crear cotización en borrador/i)).not.toBeInTheDocument();

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

  it("requests confirmation via the Cancel button on the first step", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
  });

  it("requests confirmation when clicking the overlay", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

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
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva cotización", hidden: true })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps entered state when continuing to edit", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await enterRepresentativeQuoteState(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));

    expectRepresentativeQuoteState();
    expect(screen.queryByRole("dialog", { name: "¿Descartar la cotización?" })).not.toBeInTheDocument();
  });

  it("discards state and starts fresh when reopened", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
    await enterRepresentativeQuoteState(user);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
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
});
