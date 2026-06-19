import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders asChild with a single anchor child without Radix Slot errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Button asChild variant="ghost">
        <a href="/admin/customers">Clientes</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Clientes" });
    expect(link).toBeInTheDocument();
    expect(document.querySelectorAll("a")).toHaveLength(1);
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("shows a loading spinner and accessible loading text on a normal button", () => {
    render(<Button loading>Guardar</Button>);

    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.getByText("Cargando")).toBeInTheDocument();
  });

  it("does not inject loading siblings into an asChild anchor that would break Slot", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Button asChild loading variant="primary">
        <a href="/admin/customers">Clientes</a>
      </Button>,
    );

    expect(document.querySelectorAll("a")).toHaveLength(1);
    expect(document.querySelector("a")?.children.length).toBe(0);
    expect(screen.queryByRole("status", { name: "Cargando" })).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
