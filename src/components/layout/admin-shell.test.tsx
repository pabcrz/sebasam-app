import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AdminShell } from "./admin-shell";

let mockPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));


vi.mock("@/features/auth/actions", () => ({
  logoutAdmin: vi.fn(),
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: ({ className }: { className?: string }) => (
    <button type="button" className={className}>
      Theme
    </button>
  ),
}));

describe("AdminShell", () => {
  beforeEach(() => {
    mockPathname = "/admin";
  });

  it("does not mark a mobile tab as current on the dashboard route", () => {
    mockPathname = "/admin";
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const current = mobileNav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(0);
  });

  it("marks only the matching nav item as current for /admin/customers", () => {
    mockPathname = "/admin/customers";
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Navegación principal" });
    const current = desktopNav.querySelectorAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/admin/customers");
    expect(current[0]).toHaveTextContent("Clientes");
  });

  it.each([
    ["/admin/customers", "/admin/customers"],
    ["/admin/quotes", "/admin/quotes"],
    ["/admin/work-orders", "/admin/work-orders"],
    ["/admin/notas", "/admin/notas"],
    ["/admin/workers/worker-1", "/admin/workers"],
  ])("marks only the matching mobile item as current for %s", (pathname, href) => {
    mockPathname = pathname;
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const current = mobileNav.querySelectorAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", href);
  });

  it("provides the five primary routes as keyboard-accessible mobile links", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const links = within(mobileNav).getAllByRole("link");

    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/customers",
      "/admin/quotes",
      "/admin/work-orders",
      "/admin/notas",
      "/admin/workers",
    ]);
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Clientes",
      "Cotizaciones",
      "Trabajos",
      "Notas",
      "Nómina",
    ]);
    expect(links.every((link) => link.className.includes("focus-visible:ring-2"))).toBe(true);
    expect(links.every((link) => link.className.includes("min-h-[var(--tap-min-height)]"))).toBe(true);
    expect(links.every((link) => link.querySelector(".whitespace-nowrap"))).toBe(true);
    expect(links.every((link) => link.textContent?.trim() && !link.textContent.includes("\n"))).toBe(true);
    expect(within(mobileNav).getByText("Cotiz.")).toBeInTheDocument();
    expect(mobileNav.querySelector(".grid-cols-5")).toBeInTheDocument();
    expect(mobileNav).toHaveStyle({ paddingBottom: "env(safe-area-inset-bottom)" });
  });

  it("links both SEBASAM brand marks to the dashboard", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const brandLinks = screen.getAllByRole("link", { name: "SEBASAM" });
    expect(brandLinks).toHaveLength(2);
    expect(brandLinks.every((link) => link.getAttribute("href") === "/admin")).toBe(true);
    expect(brandLinks.every((link) => link.className.includes("min-h-[var(--tap-min-height)]"))).toBe(true);
    expect(brandLinks.every((link) => link.className.includes("focus-visible:ring-[3px]"))).toBe(true);
  });
});
