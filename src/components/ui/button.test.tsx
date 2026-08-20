import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("uses the official primary gradient so primary does not regress to flat blue", () => {
    render(<Button variant="primary">Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.className).toContain("bg-[image:var(--gradient-primary)]");
    expect(button.className).toContain("hover:bg-[image:var(--gradient-primary-hover)]");
    expect(button.className).toContain("dark:bg-[var(--color-primary)]");
    expect(button.className).toContain("dark:bg-none");
  });

  it("uses pointer cursor for enabled buttons and not-allowed cursor for disabled buttons", () => {
    render(<Button disabled>Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button.className).toContain("cursor-pointer");
    expect(button.className).toContain("disabled:cursor-not-allowed");
    expect(button.className).not.toContain("disabled:pointer-events-none");
  });

  it("keeps the primary gradient token aligned with the Figma contract", () => {
    const globalsCss = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(globalsCss).toContain("--gradient-primary: linear-gradient(90deg, #004aad 0%, #001024 100%)");
    expect(globalsCss).toContain("--gradient-primary-hover: linear-gradient(90deg, #003e91 0%, #001024 100%)");
  });
});
