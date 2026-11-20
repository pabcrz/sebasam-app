import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFound from "./not-found";

vi.mock("@/components/errors/truck-stage", () => ({
  TruckStage: () => <div role="img" aria-label="Camión de carga con una llanta trasera salida" />,
}));

describe("NotFound", () => {
  it("renders the branded 404 recovery content with a single h1 and one external link", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "A esta página se le salió una llanta" })).toBeInTheDocument();
    expect(screen.getByText("No encontramos lo que buscas. Puede que se haya movido o ya no exista.")).toBeInTheDocument();
    expect(screen.getByLabelText("404")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo de SEBASAM" })).toHaveAttribute(
      "src",
      expect.stringContaining("logo-white-short.png"),
    );
    expect(screen.getByRole("img", { name: "Camión de carga con una llanta trasera salida" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver información y contacto" })).toHaveAttribute(
      "href",
      "https://sebasam.online/info",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /inicio|home/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("keeps the brand flat instead of using the navigation gradient", () => {
    const { container } = render(<NotFound />);

    expect(container.querySelector("header")?.className).not.toContain("gradient");
  });
});
