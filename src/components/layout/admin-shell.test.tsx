import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { SVGProps } from "react";
import { AdminShell } from "./admin-shell";

let mockPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return {
    ...actual,
    Banknote: (props: SVGProps<SVGSVGElement>) => <svg data-testid="payroll-icon" {...props} />,
  };
});

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

vi.mock("@/components/font-scale-toggle", () => ({
  FontScaleToggle: ({ className }: { className?: string }) => (
    <button type="button" className={className}>
      FontScale
    </button>
  ),
}));

describe("AdminShell", () => {
  beforeEach(() => {
    mockPathname = "/admin";
  });

  it("closes the profile menu when clicking outside it", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const profileMenu = screen.getByText("Salir").closest("details");
    expect(profileMenu).not.toBeNull();
    fireEvent.click(profileMenu!.querySelector("summary")!);
    expect(profileMenu).toHaveProperty("open", true);

    fireEvent.click(screen.getByText("Content"));

    expect(profileMenu).toHaveProperty("open", false);
  });

  it("keeps the profile menu open for inside clicks and preserves trigger toggling", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const profileMenu = screen.getByText("Salir").closest("details");
    const trigger = profileMenu!.querySelector("summary")!;

    fireEvent.click(trigger);
    expect(profileMenu).toHaveProperty("open", true);

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    expect(profileMenu).toHaveProperty("open", true);

    fireEvent.click(trigger);
    expect(profileMenu).toHaveProperty("open", false);
  });

  it("marks the Inicio mobile tab as current on the dashboard route", () => {
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
  });

  it.each([
    ["/admin/customers", "/admin/customers", "Clientes"],
    ["/admin/workers", "/admin/workers", "Trabajadores"],
    ["/admin/quotes", "/admin/quotes", "Cotizaciones"],
    ["/admin/work-orders", "/admin/work-orders", "Trabajos"],
    ["/admin/notas", "/admin/notas", "Notas"],
    ["/admin/nomina", "/admin/nomina", "Nómina"],
    ["/admin/historical", "/admin/historical", "Histórico"],
    ["/asistente", "/asistente", "Asistente"],
  ])("marks only the matching desktop item as current for %s", (pathname, href, label) => {
    mockPathname = pathname;
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Navegación principal" });
    const current = desktopNav.querySelectorAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", href);
    expect(current[0]).toHaveTextContent(label);
  });

  it.each([
    ["/admin", "/admin"],
    ["/admin/quotes", "/admin/quotes"],
    ["/admin/work-orders", "/admin/work-orders"],
    ["/admin/notas", "/admin/notas"],
  ])("marks only the matching primary mobile item as current for %s", (pathname, href) => {
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

  it.each([
    "/admin/customers",
    "/admin/nomina",
    "/admin/historical",
    "/asistente",
    "/admin/nomina/worker-1",
  ])("marks the Más button as current for secondary route %s", (pathname) => {
    mockPathname = pathname;
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const current = mobileNav.querySelectorAll('[aria-current="page"]');

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("aria-label", "Más");
  });

  it("provides 5 items in mobile nav and opens secondary destinations on Más tap", async () => {
    const { fireEvent } = await import("@testing-library/react");
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
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Inicio",
      "Cotizaciones",
      "Trabajos",
      "Notas",
    ]);
    expect(links.every((link) => link.className.includes("focus-visible:ring-2"))).toBe(true);
    expect(links.every((link) => link.className.includes("min-h-[var(--tap-min-height)]"))).toBe(true);
    expect(within(mobileNav).getByText("Cotiz.")).toBeInTheDocument();

    const moreButton = within(mobileNav).getByRole("button", { name: "Más" });
    expect(moreButton).toBeInTheDocument();
    expect(mobileNav.querySelector(".grid-cols-5")).toBeInTheDocument();
    expect(mobileNav).toHaveStyle({ paddingBottom: "env(safe-area-inset-bottom)" });

    // Open Más drawer
    fireEvent.click(moreButton);
    const dialog = screen.getByRole("dialog", { name: "Menú secundario" });
    expect(dialog).toBeInTheDocument();

    const drawerLinks = within(dialog).getAllByRole("link");
    expect(drawerLinks.map((link) => link.getAttribute("href"))).toContain("/admin/customers");
    expect(drawerLinks.map((link) => link.getAttribute("href"))).toContain("/admin/nomina");
    expect(drawerLinks.map((link) => link.getAttribute("href"))).toContain("/admin/historical");
    expect(drawerLinks.map((link) => link.getAttribute("href"))).toContain("/asistente");

    // Close button
    const closeBtn = within(dialog).getByRole("button", { name: "Cerrar menú" });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog", { name: "Menú secundario" })).not.toBeInTheDocument();
  });

  it("does not render static Operaciones subtitle under sidebar brand mark", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const aside = screen.getByRole("complementary");
    expect(within(aside).queryByText(/operaciones/i)).not.toBeInTheDocument();
  });

  it("does not render redundant section title or h1 in desktop top bar", () => {
    mockPathname = "/admin/quotes";
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const header = screen.getByRole("banner");
    expect(within(header).queryByRole("heading")).not.toBeInTheDocument();
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

  it("hides shell navigation and header when printing", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    expect(screen.getByRole("complementary")).toHaveClass("print:hidden");
    expect(screen.getByRole("banner")).toHaveClass("print:hidden");
    expect(screen.getByRole("navigation", { name: "Navegación móvil" })).toHaveClass("print:hidden");
  });

  it("limits ADMIN desktop and mobile navigation to patron destinations", () => {
    render(
      <AdminShell displayName="Patron User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(desktopNav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/admin",
      "/admin/customers",
      "/admin/quotes",
      "/admin/work-orders",
      "/admin/notas",
    ]);

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    expect(within(mobileNav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/admin",
      "/admin/customers",
      "/admin/quotes",
      "/admin/work-orders",
      "/admin/notas",
    ]);
    expect(within(mobileNav).queryByRole("button", { name: "Más" })).not.toBeInTheDocument();
  });

  it("keeps the complete navigation for SUPER_ADMIN", () => {
    render(
      <AdminShell displayName="Super Admin" role="SUPER_ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(desktopNav).getByRole("link", { name: "Nómina" })).toBeInTheDocument();
    expect(within(desktopNav).getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
  });
});
