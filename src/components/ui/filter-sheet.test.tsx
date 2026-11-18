import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActiveFilterChips, FilterSheet } from "./filter-sheet";

function footerButtons() {
  const footer = document.querySelector("[data-dialog-footer]");
  if (!footer) throw new Error("FilterSheet footer not rendered");
  return within(footer as HTMLElement).getAllByRole("button").map((button) => button.textContent);
}

describe("FilterSheet", () => {
  it("renders the filter fields and a footer with Limpiar on the left and the result count on the right", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} resultCount={12} onClear={() => {}}>
        <label>
          Cliente
          <input />
        </label>
      </FilterSheet>,
    );

    expect(screen.getByLabelText("Cliente")).toBeInTheDocument();
    expect(footerButtons()).toEqual(["Limpiar", "Ver 12 resultados"]);
  });

  it("uses the singular result label when exactly one result matches", () => {
    render(<FilterSheet open onOpenChange={() => {}} resultCount={1} onClear={() => {}}>{null}</FilterSheet>);

    expect(footerButtons()).toEqual(["Limpiar", "Ver 1 resultado"]);
  });

  it("clears through onClear without closing, and applies then closes through Ver", () => {
    const onClear = vi.fn();
    const onApply = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} resultCount={3} onClear={onClear} onApply={onApply}>{null}</FilterSheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ver 3 resultados" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("stays open when onApply refuses the fields, and omits the count when it is unknown", () => {
    const onOpenChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} onClear={() => {}} onApply={() => false}>{null}</FilterSheet>,
    );

    expect(footerButtons()).toEqual(["Limpiar", "Ver resultados"]);
    fireEvent.click(screen.getByRole("button", { name: "Ver resultados" }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    render(<FilterSheet open={false} onOpenChange={() => {}} resultCount={0} onClear={() => {}}>{null}</FilterSheet>);

    expect(screen.queryByRole("button", { name: "Limpiar" })).not.toBeInTheDocument();
  });
});

describe("ActiveFilterChips", () => {
  it("renders nothing when no filter is active", () => {
    const { container } = render(<ActiveFilterChips filters={[]} onRemove={() => {}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders every active filter in one labelled group and removes the chosen one by id", () => {
    const onRemove = vi.fn();
    render(
      <ActiveFilterChips
        filters={[
          { id: "customer", label: "Cliente: Juan" },
          { id: "plate", label: "Placas: ABC-123" },
        ]}
        onRemove={onRemove}
      />,
    );

    const group = screen.getByRole("group", { name: "Filtros activos" });
    expect(within(group).getByRole("button", { name: "Quitar filtro: Cliente: Juan" })).toBeInTheDocument();

    fireEvent.click(within(group).getByRole("button", { name: "Quitar filtro: Placas: ABC-123" }));
    expect(onRemove).toHaveBeenCalledWith("plate");
  });
});
