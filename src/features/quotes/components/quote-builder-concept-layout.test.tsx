import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilder } from "./quote-builder";

const customers = [{ id: "cust-1", name: "Constructora del Norte" }];
const DESKTOP_QUERY = "(min-width: 1024px)";

/** Mobile is the default (jsdom reports no matches); desktop matches the lg query only. */
function setViewport(desktop: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: desktop && query === DESKTOP_QUERY,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

async function openItemsStep(user: ReturnType<typeof userEvent.setup>) {
  render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
  await user.click(screen.getByRole("combobox", { name: /cliente/i }));
  await user.click(screen.getByRole("option", { name: "Constructora del Norte" }));
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
}

function typeInput(index: number) {
  return document.querySelector(`input[name="sections.0.items.${index}.type"]`);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("quote builder concept layout (mobile)", () => {
  it("shows the concept types as one horizontally scrolling chip row in the editor", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    const types = screen.getByRole("group", { name: "Tipo del concepto 1" });
    expect(types).toHaveClass("flex-nowrap", "overflow-x-auto");
    expect(types).not.toHaveClass("flex-wrap");
    expect(within(types).getByRole("button", { name: "Mano de obra" })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(types).getByRole("button", { name: "Material" }));
    expect(within(types).getByRole("button", { name: "Material" })).toHaveAttribute("aria-pressed", "true");
    expect(typeInput(0)).toHaveValue("MATERIAL");
  });

  it("keeps quantity and unit price on one row", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    const row = screen.getByTestId("quantity-price-row-0");
    expect(row).toHaveClass("grid");
    expect(within(row).getByLabelText("Cantidad")).toBeInTheDocument();
    expect(within(row).getByLabelText("Precio unitario")).toBeInTheDocument();
  });

  it("shows the payroll toggle only for Otro concepts, not for Mano de obra", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    expect(screen.queryByRole("checkbox", { name: "Incluir en nómina / comisión" })).not.toBeInTheDocument();

    await user.click(within(screen.getByRole("group", { name: "Tipo del concepto 1" })).getByRole("button", { name: "Otro" }));
    expect(screen.getByRole("checkbox", { name: "Incluir en nómina / comisión" })).toBeInTheDocument();
  });

  it("puts Duplicar, Eliminar and Listo in the editor; Listo collapses the row", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de aceite");
    await user.click(screen.getByRole("button", { name: "Duplicar concepto 1" }));

    expect(screen.getByTestId("concept-row-1")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Listo" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Listo" }));

    expect(screen.getByTestId("concept-summary-1")).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("concept-editor-quote-item-1")).toHaveAttribute("hidden");
  });

  it("deletes the expanded concept from the editor's Eliminar action", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de aceite");
    await user.click(screen.getByRole("button", { name: "Duplicar concepto 1" }));
    expect(screen.getByTestId("concept-row-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar concepto 2" }));
    expect(screen.queryByTestId("concept-row-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("concept-row-0")).toBeInTheDocument();
  });

  it("adds a concept from a dashed add chip, appends it by type and focuses its description", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    const add = screen.getByRole("button", { name: "Agregar Refacciones a la sección 1" });
    expect(add).toHaveClass("border-dashed");
    expect(add).toHaveTextContent("Refacciones");

    await user.click(add);

    expect(screen.getByTestId("concept-row-1")).toBeInTheDocument();
    expect(typeInput(1)).toHaveValue("REFACCIONES");
    const descriptions = Array.from(document.querySelectorAll('input[name$=".description"]'));
    expect(descriptions).toHaveLength(2);
    expect(descriptions[1]).toHaveFocus();
  });
});

describe("quote builder concept layout (desktop)", () => {
  it("renders an editable table per section with Tipo, Descripción, Cant., Precio, Nóm., Importe and actions", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const table = screen.getByRole("table", { name: "Conceptos de la sección 1" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.trim())
      .filter(Boolean);
    expect(headers).toEqual(["Tipo", "Descripción", "Cant.", "Precio", "Nóm.", "Importe", "Acciones"]);
    expect(screen.queryByTestId("concept-summary-0")).not.toBeInTheDocument();
  });

  it("shows Nóm. as a fixed Sí for Mano de obra and as the opt-in toggle only for Otro", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const table = screen.getByRole("table", { name: "Conceptos de la sección 1" });
    expect(within(table).queryByRole("checkbox", { name: "Incluir en nómina / comisión" })).not.toBeInTheDocument();
    expect(screen.getByTestId("payroll-cell-0")).toHaveTextContent("Sí");

    await user.click(within(table).getByRole("combobox", { name: "Tipo del concepto 1" }));
    await user.click(screen.getByRole("option", { name: "Otro" }));
    expect(within(table).getByRole("checkbox", { name: "Incluir en nómina / comisión" })).toBeEnabled();
  });

  it("moves focus with Tab through the row fields in column order, skipping the stepper buttons", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const description = screen.getByLabelText("Descripción", { selector: "input" });
    description.focus();
    await user.tab();
    expect(screen.getByLabelText("Cantidad")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Precio unitario")).toHaveFocus();
  });

  it("adds a concept row and focuses its first field when Enter is pressed in the last field", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const price = screen.getByLabelText("Precio unitario");
    price.focus();
    await user.keyboard("{Enter}");

    const table = screen.getByRole("table", { name: "Conceptos de la sección 1" });
    expect(within(table).getAllByRole("combobox", { name: /Tipo del concepto/ })).toHaveLength(2);
    expect(within(table).getByRole("combobox", { name: "Tipo del concepto 2" })).toHaveFocus();
  });

  it("keeps the totals column fixed on the right of the page", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const summary = screen.getByTestId("quote-summary-column");
    expect(summary).toHaveClass("lg:sticky", "lg:top-0");
    expect(within(summary).getByTestId("quote-total")).toBeInTheDocument();
  });
});
