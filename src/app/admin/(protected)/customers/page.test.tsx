import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const listCustomers = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/features/customers/queries", () => ({ listCustomers }));
vi.mock("@/features/customers/actions", () => ({ createCustomerFromForm: vi.fn(), getCustomerDetail: vi.fn() }));
vi.mock("@/features/customers/components/customer-create-form", () => ({ CustomerCreateForm: () => null }));
vi.mock("@/features/customers/components/customer-card-list", () => ({ CustomerCardList: () => null }));
vi.mock("@/features/customers/components/customer-search", () => ({ CustomerSearch: () => null }));
import CustomersPage from "./page";
describe("CustomersPage", () => {
  it("renders the workspace without a redundant page header card", async () => {
    render(await CustomersPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Buscar clientes" })).toBeInTheDocument();
    expect(screen.getByText("No se encontraron clientes.")).toBeInTheDocument();
  });
});