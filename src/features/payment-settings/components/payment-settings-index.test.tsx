import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { FontScaleProvider } from "@/components/font-scale-provider";
import type { PaymentSettingsData } from "@/features/payment-settings/domain";
import { PaymentSettingsIndex } from "./payment-settings-index";

const settings: PaymentSettingsData = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
  address: "Batalla de Casa Blanca 1719B, CDMX",
  mapsUrl: "https://maps.app.goo.gl/test",
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
  hours: { weekdays: "Lunes a viernes", saturday: "Sábado" },
  services: [],
  products: [],
  bankAccounts: [
    {
      id: 1,
      accountHolder: "Federico Cruz",
      bankName: "Santander",
      accountNumber: "123456",
      clabe: "",
      isForInvoicing: true,
      isPubliclyShareable: true,
      publicToken: "santander-token",
      sortOrder: 0,
    },
    {
      id: 2,
      accountHolder: "Federico Cruz",
      bankName: "BBVA",
      accountNumber: "789012",
      clabe: "",
      isForInvoicing: false,
      isPubliclyShareable: false,
      publicToken: "bbva-token",
      sortOrder: 1,
    },
  ],
};

function renderIndex(overrides: Partial<React.ComponentProps<typeof PaymentSettingsIndex>> = {}) {
  return render(
    <ThemeProvider>
      <FontScaleProvider>
        <PaymentSettingsIndex
          settings={settings}
          activeWorkerCount={3}
          userCount={2}
          canManageUsers
          {...overrides}
        />
      </FontScaleProvider>
    </ThemeProvider>,
  );
}

describe("PaymentSettingsIndex", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-font-scale");
  });

  it("groups the settings into Taller, Cobro, Equipo y acceso and Apariencia", () => {
    renderIndex();

    for (const name of ["Taller", "Cobro", "Equipo y acceso", "Apariencia"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("shows the current value on each settings row", () => {
    renderIndex();

    const workshop = screen.getByRole("link", { name: "Abrir Datos del taller" });
    expect(within(workshop).getByText("SEBASAM")).toBeInTheDocument();
    expect(within(workshop).getByText("Batalla de Casa Blanca 1719B, CDMX")).toBeInTheDocument();

    const contact = screen.getByRole("link", { name: "Abrir Contacto" });
    expect(within(contact).getByText("Tel. 5556007675 · WhatsApp 5536239346")).toBeInTheDocument();

    const bank = screen.getByRole("link", { name: "Abrir Cuentas bancarias" });
    expect(within(bank).getByText("Santander · BBVA")).toBeInTheDocument();
    expect(within(bank).getByText("2 cuentas")).toBeInTheDocument();

    const workers = screen.getByRole("link", { name: "Abrir Trabajadores" });
    expect(within(workers).getByText("3 activos")).toBeInTheDocument();

    const password = screen.getByRole("link", { name: "Abrir Mi contraseña" });
    expect(within(password).getByText("Cambiar contraseña")).toBeInTheDocument();
  });

  it("marks Contacto as incomplete when the fixed phone is missing", () => {
    renderIndex({ settings: { ...settings, contactPhone: "" } });

    const contact = screen.getByRole("link", { name: "Abrir Contacto" });
    expect(within(contact).getByText("Incompleto")).toBeInTheDocument();
    expect(within(contact).getByText("WhatsApp 5536239346")).toBeInTheDocument();
  });

  it("links each settings row to its own screen and each team row to its existing page", () => {
    renderIndex();

    expect(screen.getByRole("link", { name: "Abrir Datos del taller" })).toHaveAttribute(
      "href",
      "/admin/configuracion-pago/datos-del-taller",
    );
    expect(screen.getByRole("link", { name: "Abrir Contacto" })).toHaveAttribute(
      "href",
      "/admin/configuracion-pago/contacto",
    );
    expect(screen.getByRole("link", { name: "Abrir Cuentas bancarias" })).toHaveAttribute(
      "href",
      "/admin/configuracion-pago/cuentas-bancarias",
    );
    expect(screen.getByRole("link", { name: "Abrir Apariencia" })).toHaveAttribute(
      "href",
      "/admin/configuracion-pago/apariencia",
    );
    expect(screen.getByRole("link", { name: "Abrir Trabajadores" })).toHaveAttribute("href", "/admin/workers");
    expect(screen.getByRole("link", { name: "Abrir Usuarios" })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("link", { name: "Abrir Mi contraseña" })).toHaveAttribute(
      "href",
      "/admin/change-password",
    );
  });

  it("hides Usuarios from viewers who are not SUPER_ADMIN", () => {
    renderIndex({ canManageUsers: false });

    expect(screen.queryByRole("link", { name: "Abrir Usuarios" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir Trabajadores" })).toBeInTheDocument();
  });

  it("shows the appearance currently stored on this device", async () => {
    localStorage.setItem("sebasam-theme", "dark");
    localStorage.setItem("sebasam-font-scale", "large");

    renderIndex();

    expect(await screen.findByText("Oscuro · Texto grande")).toBeInTheDocument();
  });
});
