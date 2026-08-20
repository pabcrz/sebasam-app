import type React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerCardList, CustomerCardListItem } from "./customer-card-list";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function buildCustomer(overrides: Partial<CustomerCardListItem> = {}): CustomerCardListItem {
  return {
    id: "cust-1",
    name: "Constructora del Norte",
    email: "contacto@cdn.mx",
    phone: "55 1234 5678",
    status: "ACTIVE",
    ...overrides,
  };
}

describe("CustomerCardList contact display", () => {
  const getCustomerDetail = vi.fn();

  it("opens the customer account from the card while keeping edit as an explicit action", () => {
    render(<CustomerCardList customers={[buildCustomer()]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByRole("button", { name: "Ver cuenta de Constructora del Norte" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      "/admin/customers/cust-1/edit",
    );
  });

  it("renders email and phone when both exist", () => {
    render(<CustomerCardList customers={[buildCustomer()]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("contacto@cdn.mx")).toBeInTheDocument();
    expect(screen.getByText("55 1234 5678")).toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
  });

  it("renders only email when phone is missing", () => {
    render(<CustomerCardList customers={[buildCustomer({ phone: null })]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("contacto@cdn.mx")).toBeInTheDocument();
    expect(screen.queryByText("55 1234 5678")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
  });

  it("renders only phone when email is missing", () => {
    render(<CustomerCardList customers={[buildCustomer({ email: null })]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("55 1234 5678")).toBeInTheDocument();
    expect(screen.queryByText("contacto@cdn.mx")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
  });

  it("renders Sin contacto when neither email nor phone exist", () => {
    render(<CustomerCardList customers={[buildCustomer({ email: null, phone: null })]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("Sin contacto")).toBeInTheDocument();
    expect(screen.queryByText("contacto@cdn.mx")).not.toBeInTheDocument();
    expect(screen.queryByText("55 1234 5678")).not.toBeInTheDocument();
  });
});
