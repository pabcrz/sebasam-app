import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { FontScaleProvider } from "@/components/font-scale-provider";

const settings = vi.hoisted(() => ({
  name: "SEBASAM",
  fullName: "SEBASAM Taller",
  address: "Av. Central",
  mapsUrl: "https://maps.example",
  contactPhone: "555",
  contactWhatsapp: "556",
  hours: { weekdays: "Lunes a viernes", saturday: "Sábado" },
  services: [],
  products: [],
  bankAccounts: [],
}));

const { requireOperationalRole, listWorkers, listUsers } = vi.hoisted(() => ({
  requireOperationalRole: vi.fn(),
  listWorkers: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireOperationalRole }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings: vi.fn().mockResolvedValue(settings) }));
vi.mock("@/features/workers/queries", () => ({ listWorkers }));
vi.mock("@/features/user-management/queries", () => ({ listUsers }));

import PaymentSettingsPage from "./page";

async function renderPage() {
  render(
    <ThemeProvider>
      <FontScaleProvider>{await PaymentSettingsPage()}</FontScaleProvider>
    </ThemeProvider>,
  );
}

describe("configuración index page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOperationalRole.mockResolvedValue({ user: {}, profile: { role: "ADMIN" } });
    listWorkers.mockResolvedValue([{ id: "w1" }, { id: "w2" }]);
    listUsers.mockResolvedValue([{ id: "u1" }]);
    localStorage.clear();
  });

  it("renders the index at the existing route with its settings groups", async () => {
    await renderPage();

    expect(screen.getByTestId("payment-settings-page-frame")).toHaveAttribute("data-layout-width", "admin");
    expect(screen.getByRole("heading", { level: 1, name: "Configuración" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Taller" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cobro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Equipo y acceso" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Apariencia" })).toBeInTheDocument();
  });

  it("shows the workshop name and the active worker count on their rows", async () => {
    await renderPage();

    expect(within(screen.getByRole("link", { name: "Abrir Datos del taller" })).getByText("SEBASAM")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "Abrir Trabajadores" })).getByText("2 activos")).toBeInTheDocument();
  });

  it("does not load or show Usuarios for an ADMIN", async () => {
    await renderPage();

    expect(listUsers).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "Abrir Usuarios" })).not.toBeInTheDocument();
  });

  it("shows Usuarios with its count for a SUPER_ADMIN", async () => {
    requireOperationalRole.mockResolvedValue({ user: {}, profile: { role: "SUPER_ADMIN" } });
    await renderPage();

    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("link", { name: "Abrir Usuarios" })).getByText("1 usuario")).toBeInTheDocument();
  });
});
