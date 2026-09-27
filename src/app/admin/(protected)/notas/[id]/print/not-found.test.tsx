import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("PrintNotFound", () => {
  it("renders the shared 404 recovery experience with note-specific contact copy", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "A esta página se le zafó un tornillo" })).toBeInTheDocument();
    expect(screen.getByLabelText("404")).toBeInTheDocument();
    expect(screen.getByText("La nota que buscas no está disponible, consulta al taller")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /engranaje/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visita SEBASAM" })).toHaveAttribute("href", "https://sebasam.online");
    expect(screen.queryByRole("link", { name: /inicio|home/i })).not.toBeInTheDocument();
  });
});
