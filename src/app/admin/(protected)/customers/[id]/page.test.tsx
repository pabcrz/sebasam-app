import type React from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCustomerProfileMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/features/customers/queries", () => ({
  getCustomerProfile: getCustomerProfileMock,
}));

vi.mock("@/features/customers/actions", () => ({
  deleteCustomerFromForm: vi.fn(),
  createCustomerContactAction: vi.fn(),
  updateCustomerAction: vi.fn(),
  updateCustomerContactAction: vi.fn(),
  toggleCustomerContactActiveAction: vi.fn(),
  deleteCustomerContactAction: vi.fn(),
}));

import CustomerDetailPage from "./page";

describe("CustomerDetailPage", () => {
  const customer = {
    id: "cust-1",
    name: "Constructora del Norte",
    commercialName: null,
    legalName: "Constructora del Norte S.A. de C.V.",
    email: "contacto@cdn.mx",
    phone: "55 1234 5678",
    address: "Av. Central 123",
    notes: "Facturar al cierre del mes.",
    status: "ACTIVE",
    contacts: [],
    vehicles: [
      {
        id: "veh-1",
        economicNumber: "118",
        plate: "LX-5520",
        brand: "Kenworth",
        model: "T800",
        year: 2019,
        color: "Blanco",
        notes: null,
        inWorkshop: true,
      },
    ],
    _count: { quotes: 0, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
  };
  const balance = { pendingBalanceCents: 450000, availableCreditCents: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the ficha as a page with Resumen, Vehículos and Contactos tabs", async () => {
    getCustomerProfileMock.mockResolvedValue({ customer, balance });

    render(await CustomerDetailPage({ params: Promise.resolve({ id: customer.id }), searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { level: 1, name: customer.name })).toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: "Secciones del cliente" });
    expect(within(tabs).getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Vehículos" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Contactos" })).toBeInTheDocument();
    expect(getCustomerProfileMock).toHaveBeenCalledWith(customer.id);
  });

  it("shows the balance figures and the contact data, with muted text for missing values", async () => {
    getCustomerProfileMock.mockResolvedValue({ customer: { ...customer, phone: null, email: null }, balance });

    render(await CustomerDetailPage({ params: Promise.resolve({ id: customer.id }), searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.getByText("$4,500.00")).toBeInTheDocument();
    expect(screen.getByText("Saldo a favor")).toBeInTheDocument();
    expect(screen.getByText("Sin teléfono")).toBeInTheDocument();
    expect(screen.getByText("Sin correo")).toBeInTheDocument();
    expect(screen.getByText("Razón social: Constructora del Norte S.A. de C.V.")).toBeInTheDocument();
    expect(screen.getByText("Facturar al cierre del mes.")).toBeInTheDocument();
  });

  it("keeps the edit action and links to the estado de cuenta", async () => {
    getCustomerProfileMock.mockResolvedValue({ customer, balance });

    render(await CustomerDetailPage({ params: Promise.resolve({ id: customer.id }), searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    const statementLink = screen.getByRole("link", { name: /estado de cuenta/i });
    expect(statementLink).toHaveAttribute("href", `/admin/customers/${customer.id}/estado-de-cuenta`);
  });

  it("opens the Vehículos tab when the list links to ?tab=vehiculos", async () => {
    getCustomerProfileMock.mockResolvedValue({ customer, balance });

    render(
      await CustomerDetailPage({
        params: Promise.resolve({ id: customer.id }),
        searchParams: Promise.resolve({ tab: "vehiculos" }),
      }),
    );

    expect(screen.getByRole("tab", { name: "Vehículos" })).toHaveAttribute("aria-selected", "true");
    const units = screen.getByRole("list", { name: "Unidades del cliente" });
    expect(within(units).getByText("ECO 118 · Kenworth T800")).toBeInTheDocument();
    expect(within(units).getByText("En taller")).toBeInTheDocument();
  });

  it("puts delete in a danger zone at the end, blocked with its reason when the customer has history", async () => {
    getCustomerProfileMock.mockResolvedValue({
      customer: { ...customer, _count: { quotes: 2, payments: 0, paymentRequests: 0, ledgerEntries: 0 } },
      balance,
    });

    const { container } = render(
      await CustomerDetailPage({ params: Promise.resolve({ id: customer.id }), searchParams: Promise.resolve({}) }),
    );

    const dangerZone = container.querySelector("[data-dialog-danger-zone]") as HTMLElement | null;
    expect(dangerZone).not.toBeNull();
    expect(container.querySelector("section")?.lastElementChild).toBe(dangerZone);
    expect(within(dangerZone!).getByRole("button", { name: /eliminar cliente/i })).toBeDisabled();
    expect(screen.getByText("No se puede eliminar: tiene 2 cotizaciones asociadas")).toBeInTheDocument();
  });

  it("uses the existing not-found boundary for an unknown customer", async () => {
    getCustomerProfileMock.mockResolvedValue(null);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(
      CustomerDetailPage({ params: Promise.resolve({ id: "missing" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
