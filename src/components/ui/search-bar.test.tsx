import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar, normalizeSearchTerm } from "./search-bar";

describe("normalizeSearchTerm", () => {
  it("trims, lowercases, collapses spaces and drops accents so ñ and é match plain typing", () => {
    expect(normalizeSearchTerm("  Folio   ABC-12 ")).toBe("folio abc-12");
    expect(normalizeSearchTerm("Muñoz Ecó")).toBe("munoz eco");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeSearchTerm("   ")).toBe("");
  });
});

describe("SearchBar", () => {
  it("is controlled: it shows the value it is given and reports each keystroke", () => {
    const onValueChange = vi.fn();
    render(<SearchBar value="ABC" onValueChange={onValueChange} />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("ABC");

    fireEvent.change(input, { target: { value: "ABCD" } });
    expect(onValueChange).toHaveBeenCalledWith("ABCD");
  });

  it("names what it understands in the placeholder and accessible name", () => {
    render(<SearchBar value="" onValueChange={() => {}} />);

    const input = screen.getByRole("searchbox", { name: "Buscar por folio, cliente, chofer, placas, ECO y concepto" });
    expect(input).toHaveAttribute("placeholder", "Buscar por folio, cliente, chofer, placas, ECO y concepto");
  });

  it("shows a clear button only when there is text, and clearing reports an empty value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<SearchBar value="" onValueChange={onValueChange} />);
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();

    rerender(<SearchBar value="Juan" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("uses the 36px control height and the 12px radius", () => {
    render(<SearchBar value="" onValueChange={() => {}} />);

    const input = screen.getByRole("searchbox");
    expect(input.className).toContain("h-[var(--control-md)]");
    expect(input.className).toContain("rounded-[var(--radius-md)]");
  });
});
