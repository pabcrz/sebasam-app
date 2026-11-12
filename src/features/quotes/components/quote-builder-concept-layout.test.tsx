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

    expect(screen.queryByRole("switch", { name: "Incluir en nómina / comisión" })).not.toBeInTheDocument();

    await user.click(within(screen.getByRole("group", { name: "Tipo del concepto 1" })).getByRole("button", { name: "Otro" }));
    expect(screen.getByRole("switch", { name: "Incluir en nómina / comisión" })).toBeInTheDocument();
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
  it("renders an editable table per section whose header reads only CONCEPTO, TIPO and IMPORTE", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const table = screen.getByRole("table", { name: "Conceptos de la sección 1" });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.trim())
      .filter(Boolean);
    expect(headers).toEqual(["CONCEPTO", "TIPO", "IMPORTE"]);
    expect(screen.queryByTestId("concept-summary-0")).not.toBeInTheDocument();
  });

  it("splits each concept into two rows: what it is (Concepto, Tipo, Importe) and how much (Cant., P. unitario, nómina, actions)", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const [what, how] = within(screen.getByTestId("concept-row-0")).getAllByRole("row");
    expect(within(what!).getByLabelText("Descripción", { selector: "input" })).toBeInTheDocument();
    expect(within(what!).getByRole("combobox", { name: "Tipo del concepto 1" })).toBeInTheDocument();
    expect(within(what!).getByTestId("concept-total-0")).toHaveTextContent("$0.00");
    expect(within(how!).getByLabelText("Cantidad")).toBeInTheDocument();
    expect(within(how!).getByLabelText("Precio unitario")).toBeInTheDocument();
    expect(within(how!).getByRole("button", { name: "Duplicar concepto 1" })).toBeInTheDocument();
    expect(within(how!).getByRole("button", { name: "Eliminar concepto 1" })).toBeInTheDocument();
  });

  it("shows Importe as $0.00 for a concept without price, never Pendiente", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    expect(screen.getByTestId("concept-total-0")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("concept-total-0")).not.toHaveTextContent("Pendiente");
  });

  it("puts Agregar sección as an outline button in the step header, not below the sections", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const header = screen.getByRole("heading", { level: 3, name: "Conceptos" }).parentElement!;
    expect(within(header).getByRole("button", { name: "Agregar sección" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Agregar sección" })).toHaveLength(1);
  });

  it("gives each desktop section a card surface with shadow and no border", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const section = screen.getByTestId("section-0");
    expect(section).toHaveClass("lg:bg-[var(--color-surface)]", "lg:shadow-[var(--shadow-card)]");
    expect(section).not.toHaveClass("lg:border");
  });

  it("shows a green Nómina label for Mano de obra and an aria-pressed billete toggle only for Otro", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const table = screen.getByRole("table", { name: "Conceptos de la sección 1" });
    expect(within(table).queryByRole("switch", { name: "Incluir en nómina / comisión" })).not.toBeInTheDocument();
    expect(screen.getByTestId("payroll-cell-0")).toHaveTextContent("Nómina");
    expect(within(screen.getByTestId("payroll-cell-0")).getByText("Nómina")).toHaveClass("text-[var(--color-status-success-fg)]");

    await user.click(within(table).getByRole("combobox", { name: "Tipo del concepto 1" }));
    await user.click(screen.getByRole("option", { name: "Otro" }));
    expect(screen.getByTestId("payroll-cell-0")).not.toHaveTextContent("Nómina");
    const toggle = within(table).getByRole("button", { name: "Incluir en nómina / comisión" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector('input[name="sections.0.items.0.includeInPayroll"]')).toHaveValue("on");
    expect(within(table).getByRole("spinbutton", { name: "Porcentaje de comisión del concepto 1" })).toHaveValue(40);
  });

  it("moves focus with Tab through Concepto, Tipo, Cantidad and Precio, skipping the stepper buttons", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openItemsStep(user);

    const description = screen.getByLabelText("Descripción", { selector: "input" });
    description.focus();
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Tipo del concepto 1" })).toHaveFocus();
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
    expect(screen.getAllByLabelText("Descripción", { selector: "input" })[1]).toHaveFocus();
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

describe("quote builder concept hierarchy (mobile, visual batch 3)", () => {
  it("shows the empty concept as Nuevo concepto with $0.00 and no pending line", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);
    await user.click(screen.getByRole("button", { name: "Listo" }));

    const summary = screen.getByTestId("concept-summary-0");
    expect(summary).toHaveTextContent("Nuevo concepto");
    expect(summary).toHaveTextContent("$0.00");
    expect(summary).not.toHaveTextContent("Concepto sin descripción");
    expect(summary).not.toHaveTextContent("Pendiente");
  });

  it("closes a concept with its type, a green Nómina marker when it counts, its amount and a chevron", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);
    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de aceite");
    await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "250");
    await user.click(screen.getByRole("button", { name: "Listo" }));

    const summary = screen.getByTestId("concept-summary-0");
    expect(within(summary).getByText("Cambio de aceite")).toBeInTheDocument();
    expect(within(summary).getByText("Mano de obra")).toBeInTheDocument();
    expect(within(summary).getByText("Nómina")).toHaveClass("text-[var(--color-status-success-fg)]");
    expect(within(summary).getByText("$250.00")).toBeInTheDocument();
    expect(summary.querySelector('[data-slot="chevron"], svg')).toBeInTheDocument();
  });

  it("shows no Nómina marker for an Otro concept that is not in payroll", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);
    await user.click(within(screen.getByRole("group", { name: "Tipo del concepto 1" })).getByRole("button", { name: "Otro" }));
    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Permiso municipal");
    await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "80");
    await user.click(screen.getByRole("button", { name: "Listo" }));

    const summary = screen.getByTestId("concept-summary-0");
    expect(within(summary).getByText("Otro")).toBeInTheDocument();
    expect(within(summary).queryByText("Nómina")).not.toBeInTheDocument();
  });

  it("shows each section subtotal to the right of its bold name", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    const section = screen.getByTestId("section-0");
    expect(within(section).getByTestId("section-subtotal-0")).toHaveTextContent("$0.00");
    expect(within(section).getByLabelText("Nombre de la sección 1")).toHaveClass("font-bold");

    await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Aceite");
    await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "100");
    expect(within(section).getByTestId("section-subtotal-0")).toHaveTextContent("$100.00");
  });

  it("tints the open concept with the muted surface, back to surface when closed, and drops the editor's left indent", async () => {
    const user = userEvent.setup();
    await openItemsStep(user);

    const row = screen.getByTestId("concept-row-0");
    expect(row).toHaveClass("bg-[var(--color-surface-muted)]");

    const editor = document.getElementById(screen.getByTestId("concept-summary-0").getAttribute("aria-controls") ?? "");
    expect(editor).not.toHaveClass("pl-[52px]");

    await user.click(screen.getByRole("button", { name: "Listo" }));
    expect(row).toHaveClass("bg-[var(--color-surface)]");
    expect(row).not.toHaveClass("bg-[var(--color-surface-muted)]");
  });
});
