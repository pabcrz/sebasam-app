import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("CotizacionNotFound", () => {
  it("renders the quote-specific unavailable message", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "A esta página se le zafó un tornillo" })).toBeInTheDocument();
    expect(screen.getByText("La cotización que buscas no está disponible, consulta al taller")).toBeInTheDocument();
  });
});
