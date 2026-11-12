import type React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomerCardList, type CustomerCardListItem } from "./customer-card-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
    commercialName: null,
    legalName: null,
    email: "contacto@cdn.mx",
    phone: "55 1234 5678",
    status: "ACTIVE",
    pendingBalanceCents: 0,
    vehicles: [],
    contacts: [],
    ...overrides,
  };
}

function unit(id: string, overrides: Partial<CustomerCardListItem["vehicles"][number]> = {}) {
  return {
    id,
    economicNumber: null,
    plate: null,
    brand: null,
    model: null,
    year: null,
    inWorkshop: false,
    ...overrides,
  };
}

describe("CustomerCardList rows", () => {
  it("links each row to its ficha page with the balance on the right", () => {
    render(
      <CustomerCardList
        customers={[buildCustomer({ pendingBalanceCents: 450000 }), buildCustomer({ id: "cust-2", name: "Lx Automotriz", pendingBalanceCents: 0 })]}
      />,
    );

    expect(screen.getByRole("link", { name: "Ver ficha de Constructora del Norte" })).toHaveAttribute(
      "href",
      "/admin/customers/cust-1",
    );
    expect(screen.getByText("$4,500.00")).toBeInTheDocument();
    expect(screen.getByText("Al corriente")).toBeInTheDocument();
  });

  it("never shows Activo, and marks only inactive customers", () => {
    render(
      <CustomerCardList
        customers={[buildCustomer(), buildCustomer({ id: "cust-2", name: "Sergio Hiedra", status: "INACTIVE" })]}
      />,
    );

    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
    expect(screen.getAllByText("Inactivo")).toHaveLength(1);
  });

  it("shows the phone, or Sin teléfono in muted text when it is missing", () => {
    const { rerender } = render(<CustomerCardList customers={[buildCustomer()]} />);
    expect(screen.getByText("55 1234 5678")).toBeInTheDocument();
    expect(screen.queryByText("Sin teléfono")).not.toBeInTheDocument();

    rerender(<CustomerCardList customers={[buildCustomer({ phone: null })]} />);
    expect(screen.getByText("Sin teléfono")).toBeInTheDocument();
  });

  it("shows up to two units in full lines, workshop ones first, with En taller and the count of the rest", () => {
    const customer = buildCustomer({
      vehicles: [
        unit("v-1", { economicNumber: "042", brand: "International", model: "4400" }),
        unit("v-2", { economicNumber: "118", brand: "Kenworth", model: "T800", inWorkshop: true }),
        unit("v-3", { plate: "LX-5520", brand: "Isuzu", model: "ELF" }),
      ],
    });

    render(<CustomerCardList customers={[customer]} />);

    const link = screen.getByRole("link", { name: "Ver ficha de Constructora del Norte" });
    expect(within(link).getByText("ECO 118 · Kenworth T800")).toBeInTheDocument();
    expect(within(link).getByText("En taller")).toBeInTheDocument();
    expect(within(link).getByText("ECO 042 · International 4400")).toBeInTheDocument();
    expect(within(link).queryByText("LX-5520 · Isuzu ELF")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+1 unidad más" })).toHaveAttribute(
      "href",
      "/admin/customers/cust-1?tab=vehiculos",
    );
  });

  it("names the unit that matches the search", () => {
    const customer = buildCustomer({
      vehicles: [unit("v-1", { economicNumber: "118", brand: "Kenworth", model: "T800" })],
    });

    render(<CustomerCardList customers={[customer]} query="118" />);

    expect(screen.getByText("Coincide: ECO 118 · Kenworth T800")).toBeInTheDocument();
  });

  it("puts each unit on its own line with a car icon, under a dashed top rule", () => {
    const customer = buildCustomer({
      vehicles: [unit("v-1", { economicNumber: "042", brand: "International", model: "4400" })],
    });

    render(<CustomerCardList customers={[customer]} />);

    const units = screen.getByTestId("customer-unit-list");
    expect(units).toHaveClass("border-t", "border-dashed");
    const line = within(units).getByText("ECO 042 · International 4400").parentElement;
    expect(line?.querySelector("svg")).not.toBeNull();
  });

  it("shows the balance on every row: $0.00 with Al corriente at zero, the amount with Pendiente when owed", () => {
    render(
      <CustomerCardList
        customers={[buildCustomer({ pendingBalanceCents: 450000 }), buildCustomer({ id: "cust-2", name: "Lx Automotriz", pendingBalanceCents: 0 })]}
      />,
    );

    expect(screen.getByText("$4,500.00")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("Al corriente")).toBeInTheDocument();
  });

  it("renders all rows inside one surface with dividers, not a card per row", () => {
    render(<CustomerCardList customers={[buildCustomer(), buildCustomer({ id: "cust-2", name: "Lx Automotriz" })]} />);

    const list = screen.getByRole("list");
    expect(list).toHaveClass("divide-y", "shadow-[var(--shadow-card)]");
    expect(within(list).getAllByRole("link")).toHaveLength(2);
    for (const link of within(list).getAllByRole("link")) {
      expect(link.className).not.toMatch(/shadow-\[var\(--shadow-card\)\]/);
    }
  });

  it("filters the loaded list with Con saldo and Inactivos", async () => {
    const user = userEvent.setup();
    render(
      <CustomerCardList
        customers={[
          buildCustomer({ id: "cust-1", name: "Con deuda", pendingBalanceCents: 100 }),
          buildCustomer({ id: "cust-2", name: "Al corriente" }),
          buildCustomer({ id: "cust-3", name: "Dado de baja", status: "INACTIVE" }),
        ]}
      />,
    );
    const filters = screen.getByRole("group", { name: "Filtrar clientes" });

    await user.click(within(filters).getByRole("button", { name: "Con saldo" }));
    expect(screen.queryByText("Al corriente")).not.toBeInTheDocument();
    expect(screen.getByText("Con deuda")).toBeInTheDocument();
    expect(screen.queryByText("Dado de baja")).not.toBeInTheDocument();

    await user.click(within(filters).getByRole("button", { name: "Inactivos" }));
    expect(screen.queryByText("Con deuda")).not.toBeInTheDocument();
    expect(screen.getByText("Dado de baja")).toBeInTheDocument();
  });
});

describe("CustomerCardList selection and batch delete", () => {
  const onDeleteBatch = vi.fn();

  it("supports entering selection mode, selecting eligible rows, and canceling", async () => {
    const user = userEvent.setup();
    const cust1 = buildCustomer({ id: "c-1", name: "Cliente 1" });
    const cust2 = buildCustomer({
      id: "c-2",
      name: "Cliente 2",
      _count: { quotes: 1, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
    });

    render(<CustomerCardList customers={[cust1, cust2]} onDeleteBatch={onDeleteBatch} />);

    await user.click(screen.getByRole("button", { name: /^seleccionar$/i }));

    const checkbox1 = screen.getByRole("checkbox", { name: /seleccionar cliente 1/i });
    const checkbox2 = screen.getByRole("checkbox", { name: /seleccionar cliente 2/i });

    expect(checkbox1).toBeEnabled();
    expect(checkbox2).toBeDisabled();

    await user.click(checkbox1);
    expect(checkbox1).toBeChecked();
    expect(screen.getByText(/1 seleccionado/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("triggers batch delete confirmation and executes deletion on confirm", async () => {
    const user = userEvent.setup();
    onDeleteBatch.mockResolvedValue({ success: true, deletedCount: 2 });
    const cust1 = buildCustomer({ id: "c-1", name: "Cliente 1" });
    const cust2 = buildCustomer({ id: "c-2", name: "Cliente 2" });

    render(<CustomerCardList customers={[cust1, cust2]} onDeleteBatch={onDeleteBatch} />);

    await user.click(screen.getByRole("button", { name: /^seleccionar$/i }));
    await user.click(screen.getByRole("button", { name: /seleccionar todos/i }));

    expect(screen.getByText(/2 seleccionados/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /eliminar seleccionados/i }));
    expect(screen.getByRole("dialog", { name: /eliminar clientes/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirmar eliminación/i }));
    expect(onDeleteBatch).toHaveBeenCalledWith(["c-1", "c-2"]);
  });
});
