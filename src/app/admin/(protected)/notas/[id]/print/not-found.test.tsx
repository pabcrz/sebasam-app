import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("PrintNotFound", () => {
  it("explains that the requested note is unavailable and to contact the workshop", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Nota no disponible" })).toBeInTheDocument();
    expect(screen.getByText("La nota que buscas no está disponible, consulta al taller")).toBeInTheDocument();
  });
});
