import type React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCustomerByIdMock = vi.hoisted(() => vi.fn());
const getCustomerAccountStatementMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());
const customerAccountStatementMock = vi.hoisted(() => vi.fn(() => <div data-testid="customer-account-statement" />));

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
  getCustomerAccountStatement: getCustomerAccountStatementMock,
}));

vi.mock("@/features/customers/components/customer-account-statement", () => ({
  CustomerAccountStatement: customerAccountStatementMock,
}));
vi.mock("@/features/payments/actions", () => ({ correctPaymentAction: vi.fn() }));

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
  const statement = {
    totalContractedCents: 25000,
    totalPaidCents: 17500,
    pendingBalanceCents: 7500,
    movements: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows read-only customer context and its account statement with an explicit edit action", async () => {
    getCustomerByIdMock.mockResolvedValue(customer);
    getCustomerAccountStatementMock.mockResolvedValue(statement);

    render(await CustomerDetailPage({ params: Promise.resolve({ id: customer.id }) }));

    expect(screen.getByRole("heading", { name: customer.name })).toBeInTheDocument();
    expect(screen.getByText("contacto@cdn.mx")).toBeInTheDocument();
    expect(screen.getByText("Facturar al cierre del mes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByTestId("customer-edit-form")).not.toBeInTheDocument();
    expect(getCustomerByIdMock).toHaveBeenCalledWith(customer.id);
    expect(getCustomerAccountStatementMock).toHaveBeenCalledWith(customer.id);
    expect(customerAccountStatementMock).toHaveBeenCalledWith(
      { statement, correctPaymentAction: expect.any(Function) },
      undefined,
    );
  });

  it("uses the existing not-found boundary for an unknown customer", async () => {
    getCustomerByIdMock.mockResolvedValue(null);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(CustomerDetailPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getCustomerAccountStatementMock).not.toHaveBeenCalled();
  });
});
