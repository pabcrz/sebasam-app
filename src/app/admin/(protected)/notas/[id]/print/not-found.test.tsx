import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFound from "./not-found";

vi.mock("@/components/errors/truck-stage", () => ({
  TruckStage: () => <div role="img" aria-label="Camión de carga con una llanta trasera salida" />,
}));

describe("PrintNotFound", () => {
  it("renders the shared 404 recovery experience with note-specific contact copy", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "A esta página se le salió una llanta" })).toBeInTheDocument();
    expect(screen.getByLabelText("404")).toBeInTheDocument();
    expect(screen.getByText("La nota que buscas no está disponible, consulta al taller")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo de SEBASAM" })).toHaveAttribute(
      "src",
      expect.stringContaining("logo-white-short.png"),
    );
    expect(screen.getByRole("link", { name: "Ver información y contacto" })).toHaveAttribute(
      "href",
      "https://sebasam.online/info",
    );
    expect(screen.queryByRole("link", { name: /inicio|home/i })).not.toBeInTheDocument();
  });
});
