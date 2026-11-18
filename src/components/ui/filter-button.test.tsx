import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterButton } from "./filter-button";

describe("FilterButton", () => {
  it("is icon-only and named Filtros", () => {
    render(<FilterButton />);
    const button = screen.getByRole("button", { name: "Filtros" });
    expect(button).toHaveTextContent("");
  });

  it("shows the applied count as a badge and in the accessible name", () => {
    render(<FilterButton count={3} />);
    expect(screen.getByRole("button", { name: "Filtros (3)" })).toHaveTextContent("3");
  });
});
