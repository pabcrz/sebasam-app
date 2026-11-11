import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusFilterNav } from "./status-filter-nav";

describe("StatusFilterNav", () => {
  it("renders a named navigation of links with the active status as current", () => {
    render(
      <StatusFilterNav
        label="Estado de pago"
        items={[
          { href: "/admin/notas?payment=all", label: "Todas" },
          { href: "/admin/notas?payment=paid", label: "Pagadas", current: true },
        ]}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Estado de pago" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagadas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Todas" })).not.toHaveAttribute("aria-current");
  });

  it("renders through the segmented control: 16px container and tonal chosen option", () => {
    render(
      <StatusFilterNav
        label="Estado de pago"
        items={[
          { href: "/admin/notas?payment=all", label: "Todas" },
          { href: "/admin/notas?payment=paid", label: "Pagadas", current: true },
        ]}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Estado de pago" }).className).toContain("rounded-[var(--radius-lg)]");
    expect(screen.getByRole("link", { name: "Pagadas" }).className).toContain("bg-[var(--color-tonal-bg)]");
    expect(screen.getByRole("link", { name: "Todas" }).className).not.toContain("bg-[var(--color-tonal-bg)]");
  });
});
