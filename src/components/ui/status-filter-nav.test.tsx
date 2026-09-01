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
});
