import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFound from "./not-found";

vi.mock("@/components/errors/truck-stage", () => ({
  TruckStage: () => <div role="img" aria-label="Camión de carga con una llanta trasera salida" />,
}));

describe("CotizacionNotFound", () => {
  it("renders the quote-specific unavailable message", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "A esta página se le salió una llanta" })).toBeInTheDocument();
    expect(screen.getByText("La cotización que buscas no está disponible, consulta al taller")).toBeInTheDocument();
  });
});
