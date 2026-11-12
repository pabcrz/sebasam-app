import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AdminShell } from "./admin-shell";
import { RAIL_EXPANDED_STORAGE_KEY } from "./admin-nav";

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
    window.localStorage.clear();
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
    ["/admin/historical", "/admin/historical", "Carga de histórico"],
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

  it("shows the same four primary tabs and Más in the mobile bar for every role", () => {
    const { unmount } = render(
      <AdminShell displayName="Patron User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );
    const adminLinks = within(screen.getByRole("navigation", { name: "Navegación móvil" }))
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label"));
    unmount();

    render(
      <AdminShell displayName="Super Admin" role="SUPER_ADMIN">
        <div>Content</div>
      </AdminShell>,
    );
    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const superLinks = within(mobileNav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label"));

    expect(adminLinks).toEqual(["Inicio", "Cotizaciones", "Trabajos", "Notas"]);
    expect(superLinks).toEqual(adminLinks);
    expect(within(mobileNav).getByRole("button", { name: "Más" })).toBeInTheDocument();
    expect(mobileNav.querySelector(".grid-cols-5")).toBeInTheDocument();
  });

  it("gives every icon-only mobile destination a full accessible name and tooltip", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    const links = within(mobileNav).getAllByRole("link");

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
    expect(links.map((link) => link.getAttribute("title"))).toEqual([
      "Inicio",
      "Cotizaciones",
      "Trabajos",
      "Notas",
    ]);
    expect(links.every((link) => link.className.includes("focus-visible:ring-2"))).toBe(true);
    expect(links.every((link) => link.className.includes("min-h-[var(--tap-min-height)]"))).toBe(true);
    expect(within(mobileNav).queryByText(/Cotiz\.|Hist\.|^IA$/)).not.toBeInTheDocument();
    expect(mobileNav).toHaveStyle({ paddingBottom: "env(safe-area-inset-bottom)" });
  });

  it("opens the grouped Más sheet and turns Más into Cerrar while it is open", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    fireEvent.click(within(mobileNav).getByRole("button", { name: "Más" }));

    const dialog = screen.getByRole("dialog", { name: "Más" });
    expect(within(mobileNav).getByRole("button", { name: "Cerrar" })).toHaveAttribute("aria-expanded", "true");
    expect(within(mobileNav).queryByRole("button", { name: "Más" })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar menú" }));
    expect(screen.queryByRole("dialog", { name: "Más" })).not.toBeInTheDocument();
    expect(within(mobileNav).getByRole("button", { name: "Más" })).toHaveAttribute("aria-expanded", "false");
  });

  it("lists only ADMIN destinations in the Más sheet for ADMIN", () => {
    render(
      <AdminShell displayName="Patron User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegación móvil" })).getByRole("button", { name: "Más" }));
    const dialog = screen.getByRole("dialog", { name: "Más" });

    expect(within(dialog).getByRole("group", { name: "Operación" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("group", { name: "Herramientas" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("group", { name: "Administración" })).not.toBeInTheDocument();

    const operacion = within(dialog).getByRole("group", { name: "Operación" });
    expect(within(operacion).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/admin/customers",
      "/admin/nomina",
    ]);
  });

  it("groups the Más sheet into Operación, Herramientas and Administración for SUPER_ADMIN", () => {
    render(
      <AdminShell displayName="Super Admin" role="SUPER_ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegación móvil" })).getByRole("button", { name: "Más" }));
    const dialog = screen.getByRole("dialog", { name: "Más" });

    const groups = within(dialog).getAllByRole("group").map((group) => group.getAttribute("aria-labelledby"));
    expect(groups).toHaveLength(3);
    expect(within(dialog).getByRole("group", { name: "Operación" })).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Herramientas" })).toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "Administración" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Carga de histórico/ })).toHaveAttribute("href", "/admin/historical");
    expect(within(dialog).getByRole("link", { name: /Usuarios/ })).toHaveAttribute("href", "/admin/users");
  });

  it("marks only one item current inside the Más sheet when it is open on a secondary route", () => {
    mockPathname = "/admin/customers";
    render(
      <AdminShell displayName="Patron User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    fireEvent.click(within(screen.getByRole("navigation", { name: "Navegación móvil" })).getByRole("button", { name: "Más" }));
    const dialog = screen.getByRole("dialog", { name: "Más" });
    const current = dialog.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/admin/customers");
  });

  it("styles the Más sheet with tonal active rows, borderless gray icons and 11px group titles, keeping the gradient in the bar only", () => {
    mockPathname = "/admin/customers";
    render(
      <AdminShell displayName="Patron User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    const mobileNav = screen.getByRole("navigation", { name: "Navegación móvil" });
    fireEvent.click(within(mobileNav).getByRole("button", { name: "Más" }));
    const dialog = screen.getByRole("dialog", { name: "Más" });

    const active = dialog.querySelector('[aria-current="page"]') as HTMLElement;
    expect(active).toHaveClass("bg-[var(--color-tonal-bg)]", "text-[var(--color-tonal-fg)]", "rounded-[var(--radius-sm)]");
    expect(active.className).not.toContain("bg-[image:var(--gradient-primary)]");
    expect(active.querySelector("span")).not.toHaveClass("bg-[var(--color-blue-tint)]");
    expect(dialog.querySelector(".bg-\\[var\\(--color-surface\\)\\]")).toBeNull();

    const title = within(dialog).getByRole("heading", { name: "Operación" });
    expect(title).toHaveClass("text-[11px]", "uppercase", "text-[var(--color-text-muted)]");
    expect(dialog.querySelectorAll(".bg-\\[image\\:var\\(--gradient-primary\\)\\]")).toHaveLength(0);
  });

  it("collapses the desktop rail to 64px by default with the short logo", () => {
    render(
      <AdminShell displayName="Admin User" role="SUPER_ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("w-16");
    expect(aside).not.toHaveClass("w-64");

    const rail = aside.querySelector("[data-admin-rail]");
    expect(rail).toHaveAttribute("data-expanded", "false");

    const brandButton = screen.getByRole("button", { name: "Expandir menú" });
    expect(brandButton).toHaveAttribute("aria-expanded", "false");
    expect(brandButton.querySelector("img")).toHaveAttribute("src", "/logo-white-short.png");
    expect(brandButton.querySelector("img")?.className).toContain("brightness(0)");
  });

  it("expands the rail as an overlay without changing the rail width, and remembers it", () => {
    const { unmount } = render(
      <AdminShell displayName="Admin User" role="SUPER_ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Expandir menú" }));

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("w-16");
    expect(aside.querySelector("[data-admin-rail]")).toHaveAttribute("data-expanded", "true");
    expect(aside.querySelector("[data-admin-rail]")).toHaveClass("w-[220px]");
    expect(screen.getByRole("button", { name: "Contraer menú" })).toHaveAttribute("aria-expanded", "true");
    expect(window.localStorage.getItem(RAIL_EXPANDED_STORAGE_KEY)).not.toBeNull();
    unmount();

    render(
      <AdminShell displayName="Admin User" role="SUPER_ADMIN">
        <div>Content</div>
      </AdminShell>,
    );
    expect(screen.getByRole("complementary").querySelector("[data-admin-rail]")).toHaveAttribute(
      "data-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Contraer menú" }));
    expect(screen.getByRole("complementary").querySelector("[data-admin-rail]")).toHaveAttribute(
      "data-expanded",
      "false",
    );
  });

  it("gives the desktop sidebar a single active item with the brand gradient", () => {
    mockPathname = "/admin/quotes/new";
    render(
      <AdminShell displayName="Admin User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Navegación principal" });
    const current = desktopNav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "/admin/quotes");
    expect(current[0].className).toContain("bg-[image:var(--gradient-primary)]");
    expect(current[0].className).toContain("text-white");
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

  it("links the mobile SEBASAM brand mark to the dashboard", () => {
    render(
      <AdminShell displayName="Admin User" role="admin">
        <div>Content</div>
      </AdminShell>,
    );

    const brandLinks = screen.getAllByRole("link", { name: "SEBASAM" });
    expect(brandLinks).toHaveLength(1);
    expect(brandLinks[0]).toHaveAttribute("href", "/admin");
    expect(brandLinks[0].className).toContain("min-h-[var(--tap-min-height)]");
    expect(brandLinks[0].className).toContain("focus-visible:ring-[3px]");
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

  it("limits ADMIN desktop navigation to patron destinations", () => {
    render(
      <AdminShell displayName="Patron User" role="ADMIN">
        <div>Content</div>
      </AdminShell>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(desktopNav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/admin",
      "/admin/quotes",
      "/admin/work-orders",
      "/admin/notas",
      "/admin/customers",
      "/admin/nomina",
    ]);
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
