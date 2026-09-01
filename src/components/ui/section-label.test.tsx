import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionLabel } from "./section-label";

describe("SectionLabel", () => {
  it("renders a semantic heading by default and supports form legends", () => {
    const { rerender } = render(<SectionLabel>Resumen operativo</SectionLabel>);

    expect(screen.getByRole("heading", { name: "Resumen operativo", level: 2 })).toBeInTheDocument();

    rerender(
      <fieldset>
        <SectionLabel as="legend">Datos de contacto</SectionLabel>
      </fieldset>,
    );

    expect(screen.getByText("Datos de contacto").tagName).toBe("LEGEND");
  });
});
