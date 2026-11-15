import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkTabs } from "./link-tabs";

describe("LinkTabs", () => {
  it("renders each section as a link with its count and marks the current one", () => {
    render(
      <LinkTabs
        label="Secciones de trabajos"
        items={[
          { href: "/admin/work-orders", label: "Activos", count: 3, current: true },
          { href: "/admin/notas", label: "Completados", count: 9 },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Secciones de trabajos" });
    const active = within(nav).getByRole("link", { name: /Activos/ });
    expect(active).toHaveAttribute("href", "/admin/work-orders");
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveTextContent("3");
    const completed = within(nav).getByRole("link", { name: /Completados/ });
    expect(completed).toHaveAttribute("href", "/admin/notas");
    expect(completed).not.toHaveAttribute("aria-current");
    expect(completed).toHaveTextContent("9");
  });

  it("draws the current tab with the brand gradient underline and the others muted", () => {
    render(
      <LinkTabs
        label="Secciones"
        items={[
          { href: "/a", label: "Activos", current: true },
          { href: "/b", label: "Completados" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Activos" }).className).toMatch(/after:bg-\[image:var\(--gradient-primary\)\]/);
    expect(screen.getByRole("link", { name: "Completados" }).className).toMatch(/text-\[var\(--color-text-muted\)\]/);
  });
});
