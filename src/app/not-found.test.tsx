import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renders the branded 404 recovery content without internal navigation", () => {
    const { container } = render(<NotFound />);

    expect(screen.getByRole("heading", { name: "A esta página se le zafó un tornillo" })).toBeInTheDocument();
    expect(screen.getByText("No encontramos lo que buscas. Puede que se haya movido o ya no exista.")).toBeInTheDocument();
    expect(screen.getByLabelText("404")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo de SEBASAM" })).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByRole("heading", { name: "SEBASAM", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visita SEBASAM" })).toHaveAttribute("href", "https://sebasam.online");
    expect(screen.queryByRole("link", { name: /inicio|home/i })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /engranaje/i })).toBeInTheDocument();

    const card = container.querySelector("main > div");
    const header = card?.querySelector("header");
    const content = card?.querySelector(":scope > div:nth-child(2)");

    expect(card).not.toHaveClass("p-[var(--space-md)]");
    expect(header).toHaveClass("px-[var(--space-xl)]", "py-[var(--space-md)]");
    expect(content).toHaveClass("p-[var(--space-xl)]");
  });
});
