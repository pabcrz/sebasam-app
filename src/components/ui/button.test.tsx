import Link from "next/link";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders asChild with a single anchor child without Radix Slot errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <Button asChild variant="ghost">
        <Link href="/admin/customers">Clientes</Link>
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
        <Link href="/admin/customers">Clientes</Link>
      </Button>,
    );

    expect(document.querySelectorAll("a")).toHaveLength(1);
    expect(document.querySelector("a")?.children.length).toBe(0);
    expect(screen.queryByRole("status", { name: "Cargando" })).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("renders primary as a flat blue action without the brand gradient", () => {
    render(<Button variant="primary">Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.className).toContain("bg-[var(--color-btn-primary)]");
    expect(button.className).toContain("text-[var(--color-on-btn-primary)]");
    expect(button.className).toContain("hover:bg-[var(--color-btn-primary-hover)]");
    expect(button.className).not.toContain("gradient");
  });

  it("renders the tonal variant for card actions and keeps secondary aligned with it", () => {
    render(
      <>
        <Button variant="tonal">Autorizar</Button>
        <Button variant="secondary">Ver</Button>
      </>,
    );

    for (const name of ["Autorizar", "Ver"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("bg-[var(--color-tonal-bg)]");
      expect(button.className).toContain("text-[var(--color-tonal-fg)]");
    }
  });

  it("renders danger as an outlined risk action, never a solid red button", () => {
    render(<Button variant="danger">Desactivar</Button>);

    const button = screen.getByRole("button", { name: "Desactivar" });
    expect(button.className).toContain("border-[var(--color-status-danger-border)]");
    expect(button.className).toContain("text-[var(--color-status-danger-fg)]");
    expect(button.className).not.toContain("bg-[var(--color-status-danger)]");
  });

  it("uses the 40 / 36 / 32 control scale", () => {
    render(
      <>
        <Button size="lg">Nueva</Button>
        <Button>Guardar</Button>
        <Button size="sm">Ver</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Nueva" }).className).toContain("h-[var(--control-lg)]");
    expect(screen.getByRole("button", { name: "Guardar" }).className).toContain("h-[var(--control-md)]");
    expect(screen.getByRole("button", { name: "Ver" }).className).toContain("h-[var(--control-sm)]");
  });

  it("extends the touch area to 44 px on every size", () => {
    render(
      <>
        <Button size="lg">Nueva</Button>
        <Button>Guardar</Button>
        <Button size="sm">Ver</Button>
        <Button size="icon" aria-label="Cerrar" />
      </>,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("relative");
      expect(button.className).toContain("before:h-[max(100%,var(--tap-min-height))]");
      expect(button.className).toContain("before:w-[max(100%,var(--tap-min-height))]");
    }
  });

  it("truncates long labels inside the button instead of overflowing", () => {
    render(<Button>Etiqueta demasiado larga para caber</Button>);

    const button = screen.getByRole("button");
    expect(button.className).toContain("max-w-full");
    expect(screen.getByText("Etiqueta demasiado larga para caber").className).toContain("truncate");
  });

  it("uses pointer cursor for enabled buttons and not-allowed cursor for disabled buttons", () => {
    render(<Button disabled>Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.className).toContain("cursor-pointer");
    expect(button.className).toContain("disabled:cursor-not-allowed");
    expect(button.className).not.toContain("disabled:pointer-events-none");
  });

});
