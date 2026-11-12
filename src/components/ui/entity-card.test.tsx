import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";
import { EntityCard, EntityCardDataRow } from "./entity-card";
import { Icon } from "./icon";

function iconGlyph(name: "unit" | "driver-wheel") {
  const { container, unmount } = render(<Icon name={name} />);
  const glyph = container.querySelector("svg")?.innerHTML;
  unmount();
  return glyph;
}

function renderCard(props: Partial<React.ComponentProps<typeof EntityCard>> = {}) {
  return render(
    <EntityCard
      openLabel="Abrir C-001"
      title="Servicio general"
      folio="C-001"
      status={<span>Borrador</span>}
      amount="$116.00"
      customer="Constructora del Norte"
      unit="ECO E-12 · Ford F-150"
      driver="Juan Pérez"
      keyData={<p>Vigente hasta</p>}
      onOpen={vi.fn()}
      editAction={<button type="button" aria-label="Editar C-001">Editar</button>}
      printAction={<button type="button" aria-label="Imprimir C-001">Imprimir</button>}
      shareAction={<button type="button" aria-label="Compartir C-001">Compartir</button>}
      overflowAction={<button type="button" aria-label="Más acciones C-001">Más</button>}
      stateAction={<Button variant="tonal" size="sm">Autorizar</Button>}
      {...props}
    />,
  );
}

describe("EntityCard", () => {
  it("shows title, folio, status, and a blue tabular amount in the title row", () => {
    renderCard();

    expect(screen.getByRole("heading", { level: 3, name: "Servicio general" })).toBeInTheDocument();
    expect(screen.getByText("C-001")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    const amount = screen.getByText("$116.00");
    expect(amount).toHaveClass("text-[var(--color-amount)]", "tabular-nums");
  });

  it("shows the customer and the unit identity on separate lines", () => {
    renderCard();

    expect(screen.getByText("Constructora del Norte")).toBeInTheDocument();
    const unit = screen.getByTestId("entity-card-unit");
    expect(unit).toHaveTextContent("ECO E-12 · Ford F-150");
    expect(unit.querySelector("svg")?.innerHTML).toBe(iconGlyph("unit"));
  });

  it("shows the driver on its own line with a person icon, never mixed into the unit line", () => {
    renderCard();

    const driver = screen.getByTestId("entity-card-driver");
    expect(driver).toHaveTextContent("Juan Pérez");
    expect(driver).not.toHaveTextContent("ECO");
    expect(screen.getByTestId("entity-card-unit")).not.toHaveTextContent("Juan Pérez");
    expect(driver.querySelector("svg")?.innerHTML).toBe(iconGlyph("driver-wheel"));
  });

  it("omits the unit and driver lines when they have no data", () => {
    renderCard({ unit: null, driver: null });

    expect(screen.queryByTestId("entity-card-unit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("entity-card-driver")).not.toBeInTheDocument();
  });

  it("renders the key-data slot between the identity lines and the footer", () => {
    renderCard();

    expect(screen.getByText("Vigente hasta")).toBeInTheDocument();
  });

  it("renders tools in the fixed order Editar, Imprimir, Compartir, ⋯, then the state action on the right", () => {
    renderCard();

    const footer = screen.getByTestId("entity-card-footer");
    const labels = Array.from(footer.querySelectorAll<HTMLElement>("[aria-label], button")).map((element) =>
      element.getAttribute("aria-label") ?? element.textContent,
    );
    expect(labels).toEqual(["Editar C-001", "Imprimir C-001", "Compartir C-001", "Más acciones C-001", "Autorizar"]);
    expect(within(footer).getByTestId("entity-card-tools")).toContainElement(screen.getByRole("button", { name: "Más acciones C-001" }));
    expect(within(footer).getByTestId("entity-card-state")).toContainElement(screen.getByRole("button", { name: "Autorizar" }));
  });

  it("keeps the state action in the tonal style", () => {
    renderCard();

    expect(screen.getByRole("button", { name: "Autorizar" })).toHaveClass("bg-[var(--color-tonal-bg)]", "text-[var(--color-tonal-fg)]");
  });

  it("uses shadows only, with a deeper shadow on hover and no border", () => {
    renderCard();

    const card = screen.getByRole("group", { name: "Abrir C-001" });
    expect(card).toHaveClass("shadow-[var(--shadow-card)]", "hover:shadow-[var(--shadow-card-hover)]");
    expect(card.className).not.toMatch(/(^|\s)border(-|\s|$)/);
  });

  it("shows a 2px blue border with blue title and folio when selected", () => {
    renderCard({ selected: true });

    const card = screen.getByRole("group", { name: "Abrir C-001" });
    expect(card).toHaveClass("border-2", "border-[color-mix(in_srgb,var(--color-amount)_55%,transparent)]");
    expect(screen.getByRole("heading", { level: 3 })).toHaveClass("text-[var(--color-amount)]");
    expect(screen.getByText("C-001")).toHaveClass("text-[var(--color-amount)]");
  });

  it("has no border and no blue title when not selected", () => {
    renderCard();

    const card = screen.getByRole("group", { name: "Abrir C-001" });
    expect(card).not.toHaveClass("border-2");
    expect(screen.getByRole("heading", { level: 3 })).not.toHaveClass("text-[var(--color-amount)]");
  });

  it("calls onOpen when the card body is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderCard({ onOpen });

    await user.click(screen.getByText("Constructora del Norte"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("does not open the preview when a footer button is clicked, but still runs the button", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    renderCard({
      onOpen,
      editAction: <button type="button" aria-label="Editar C-001" onClick={onEdit}>Editar</button>,
    });

    await user.click(screen.getByRole("button", { name: "Editar C-001" }));
    await user.click(screen.getByRole("button", { name: "Autorizar" }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("does not open the preview when a menu item rendered in a portal is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { createPortal } = await import("react-dom");
    renderCard({
      onOpen,
      overflowAction: createPortal(
        <div role="menu"><button type="button" role="menuitem" aria-label="Duplicar C-001">Duplicar</button></div>,
        document.body,
      ),
    });

    await user.click(screen.getByRole("menuitem", { name: "Duplicar C-001" }));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("opens with Enter and Space when the card itself has focus", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderCard({ onOpen });

    screen.getByRole("group", { name: "Abrir C-001" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("does not open the preview when Enter is pressed on a footer button", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderCard({ onOpen });

    screen.getByRole("button", { name: "Editar C-001" }).focus();
    await user.keyboard("{Enter}");

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("is focusable with a visible focus ring", () => {
    renderCard();

    const card = screen.getByRole("group", { name: "Abrir C-001" });
    expect(card).toHaveAttribute("tabindex", "0");
    expect(card).toHaveClass("focus-visible:ring-2", "focus-visible:ring-[var(--color-focus-ring)]");
  });

  it("renders the featured variant with the same structure, as a deeper shadow with no blue background", () => {
    renderCard({ variant: "featured" });

    const card = screen.getByRole("group", { name: "Abrir C-001" });
    expect(card).toHaveAttribute("data-variant", "featured");
    expect(card).toHaveClass("shadow-[var(--shadow-card-hover)]");
    expect(card).not.toHaveClass("shadow-[var(--shadow-card)]");
    expect(card).not.toHaveClass("bg-[var(--color-blue-tint)]");
    expect(screen.getByTestId("entity-card-footer")).toBeInTheDocument();
    expect(screen.getByTestId("entity-card-unit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Autorizar" })).toBeInTheDocument();
  });

  it("renders key data as label and value rows, each with a top line and no icon", () => {
    const { container } = render(<EntityCardDataRow label="Maestro" value="Sin asignar" />);

    const row = container.firstElementChild;
    expect(screen.getByText("Maestro")).toBeInTheDocument();
    expect(screen.getByText("Sin asignar")).toBeInTheDocument();
    expect(row).toHaveClass("border-t");
    expect(row?.querySelector("svg")).toBeNull();
  });
});
