import type React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCustomerByIdMock = vi.hoisted(() => vi.fn());
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
  getCustomerById: getCustomerByIdMock,
}));

import CustomerDetailPage from "./page";

describe("CustomerDetailPage", () => {
  const customer = {
    id: "cust-1",
    name: "Constructora del Norte",
    email: "contacto@cdn.mx",
    phone: "55 1234 5678",
    address: "Av. Central 123",
    notes: "Facturar al cierre del mes.",
    status: "ACTIVE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows read-only customer context and link to full account statement with an explicit edit action", async () => {
    getCustomerByIdMock.mockResolvedValue(customer);

    render(await CustomerDetailPage({ params: Promise.resolve({ id: customer.id }) }));

    expect(screen.getByRole("heading", { name: customer.name })).toBeInTheDocument();
    expect(screen.getByText("contacto@cdn.mx")).toBeInTheDocument();
    expect(screen.getByText("Facturar al cierre del mes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    const statementLink = screen.getByRole("link", { name: /estado de cuenta/i });
    expect(statementLink).toBeInTheDocument();
    expect(statementLink).toHaveAttribute("href", `/admin/customers/${customer.id}/estado-de-cuenta`);
    expect(screen.queryByTestId("customer-edit-form")).not.toBeInTheDocument();
    expect(getCustomerByIdMock).toHaveBeenCalledWith(customer.id);
  });

  it("uses the existing not-found boundary for an unknown customer", async () => {
    getCustomerByIdMock.mockResolvedValue(null);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(CustomerDetailPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
