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

  it("marks Inicio as current only on /admin", () => {
    mockPathname = "/admin";
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const current = mobileNav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/admin");
    expect(current[0]).toHaveTextContent("Inicio");
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

  it("marks only the matching nav item as current for /admin/quotes", () => {
    mockPathname = "/admin/quotes";
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const current = mobileNav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/admin/quotes");
    expect(current[0]).toHaveTextContent("Cotizaciones");
  });

  it("provides the four primary routes as keyboard-accessible mobile links", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const links = within(mobileNav).getAllByRole("link");

    expect(links).toHaveLength(4);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin",
      "/admin/quotes",
      "/admin/work-orders",
      "/admin/notas",
    ]);
    expect(links.every((link) => link.className.includes("focus-visible:ring-2"))).toBe(true);
  });
});
