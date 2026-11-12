import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const listCustomerRows = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/features/customers/queries", () => ({ listCustomerRows }));
vi.mock("@/features/customers/actions", () => ({ createCustomerFromForm: vi.fn(), getCustomerDetail: vi.fn() }));
vi.mock("@/features/customers/components/customer-create-form", () => ({ CustomerCreateForm: () => null }));
vi.mock("@/features/customers/components/customer-card-list", () => ({ CustomerCardList: () => null }));
vi.mock("@/features/customers/components/customer-search", () => ({ CustomerSearch: () => null }));
import CustomersPage from "./page";
describe("CustomersPage", () => {
  it("renders the list on the shared page header, without a card around the search", async () => {
    render(await CustomersPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Clientes" })).toBeInTheDocument();
    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Buscar clientes" })).not.toBeInTheDocument();
    expect(screen.getByText("No se encontraron clientes.")).toBeInTheDocument();
    expect(listCustomerRows).toHaveBeenCalledWith({ query: "" });
  });

  it("passes the search text from the URL to the loader", async () => {
    render(await CustomersPage({ searchParams: Promise.resolve({ q: "Ana" }) }));
    expect(listCustomerRows).toHaveBeenCalledWith({ query: "Ana" });
  });
});
